import type { Cause } from '../Cause'
import type { Clock } from '../Clock'
import type { Exit } from '../Exit'
import type { DefaultEnv, Runtime } from '../IO/combinators/runtime'
import type { Managed } from '../Managed/core'
import type { Finalizer, ReleaseMap } from '../Managed/ReleaseMap'
import type { Schedule } from '../Schedule'
import type { StepFunction } from '../Schedule/Decision'
import type * as H from '@principia/base/Has'
import type { Erase, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe, tuple } from '@principia/base/Function'
import { mergeEnvironments, tag } from '@principia/base/Has'
import { insert } from '@principia/base/Map'
import { matchTag } from '@principia/base/util/matchers'
import { AtomicReference } from '@principia/base/util/support/AtomicReference'

import * as Ca from '../Cause'
import { currentTime, sleep } from '../Clock'
import { sequential } from '../ExecutionStrategy'
import * as Ex from '../Exit'
import { makeRuntime } from '../IO/combinators/runtime'
import * as XR from '../IORef'
import * as XRM from '../IORefM'
import * as RelMap from '../Managed/ReleaseMap'
import * as P from '../Promise'
import * as I from './internal/io'
import * as M from './internal/managed'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export const URI = 'Layer'

export type URI = typeof URI

export abstract class Layer<R, E, A> {
  readonly hash = new AtomicReference<PropertyKey>(Symbol())

  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor() {
    this.use = this.use.bind(this)
  }

  setKey(hash: symbol) {
    this.hash.set(hash)
    return this
  }

  ['_I'](): LayerInstruction {
    return this as any
  }

  /**
   * Feeds the output services of the specified layer into the input of this layer
   * layer, resulting in a new layer with the inputs of the specified layer, and the
   * outputs of this layer.
   */
  ['<<<']<R1, E1, A1>(from: Layer<R1, E1, A1>): Layer<Erase<R, A1> & R1, E | E1, A> {
    return from_(this, from)
  }

  ['>>']<E1, A1>(to: Layer<A, E1, A1>): Layer<R, E | E1, A1> {
    return to_(this, to, 'no-erase')
  }

  /**
   * Feeds the output services of this layer into the input of the specified
   * layer, resulting in a new layer with the inputs of this layer, and the
   * outputs of the specified layer.
   */
  ['>>>']<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<Erase<R1, A> & R, E | E1, A1> {
    return to_(this, to)
  }

  /**
   * Feeds the output services of the specified layer into the input of this
   * layer, resulting in a new layer with the inputs of the specified layer, and the
   * outputs of both this layer and the specified layer.
   */
  ['<+<']<R1, E1, A1>(from: Layer<R1, E1, A1>): Layer<Erase<R & R1, A1> & R1, E | E1, A & A1> {
    return using_(this, from)
  }

  /**
   * Feeds the output services of this layer into the input of the specified
   * layer, resulting in a new layer with the inputs of this layer, and the
   * outputs of both this layer and the specified layer.
   */
  ['>+>']<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<Erase<R & R1, A> & R, E | E1, A & A1> {
    return andTo_(this, to)
  }

  /**
   * Combines this layer with the specified layer, producing a new layer that
   * has the inputs of both layers, and the outputs of both layers.
   */
  ['+++']<R1, E1, A1>(that: Layer<R1, E1, A1>): Layer<R & R1, E | E1, A & A1> {
    return and_(this, that)
  }

  /**
   * Symbolic alias for productPar
   */
  ['<&>']<R1, E1, A1>(lb: Layer<R1, E1, A1>): Layer<R & R1, E | E1, readonly [A, A1]> {
    return productPar_(this, lb)
  }

  use<R1, E1, A1>(io: I.IO<R1 & A, E1, A1>): I.IO<R & R1, E | E1, A1> {
    return M.use_(build(this['+++'](identity<R1>())), (a) => I.giveAll_(io, a))
  }
}

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Layer<R, E, A>
  }
}

/*
 * -------------------------------------------
 * Instructions
 * -------------------------------------------
 */

export const LayerTag = {
  Fold: 'Fold',
  FMap: 'FMap',
  Bind: 'Bind',
  Fresh: 'Fresh',
  FromManaged: 'FromManaged',
  Defer: 'Defer',
  Map2Par: 'Map2Par',
  AllPar: 'AllPar',
  AllSeq: 'AllSeq',
  Map2Seq: 'Map2Seq'
} as const

/**
 * Type level bound to make sure a layer is complete
 */
export function main<E, A>(layer: Layer<DefaultEnv, E, A>) {
  return layer
}

export type LayerInstruction =
  | Fold<any, any, any, any, any, any, any, any, any>
  | FMap<any, any, any, any>
  | Bind<any, any, any, any, any, any>
  | Fresh<any, any, any>
  | FromManaged<any, any, any>
  | Defer<any, any, any>
  | Map2Par<any, any, any, any, any, any, any>
  | Map2Seq<any, any, any, any, any, any, any>
  | AllPar<Layer<any, any, any>[]>
  | AllSeq<Layer<any, any, any>[]>

export class Fold<R, E, A, R1, E1, A1, R2, E2, A2> extends Layer<R & R1 & Erase<R2, A>, E1 | E2, A1 | A2> {
  readonly _tag = LayerTag.Fold

  constructor(
    readonly layer: Layer<R, E, A>,
    readonly onFailure: Layer<readonly [R1, Cause<E>], E1, A1>,
    readonly onSuccess: Layer<R2, E2, A2>
  ) {
    super()
  }
}

export class FMap<R, E, A, B> extends Layer<R, E, B> {
  readonly _tag = LayerTag.FMap

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => B) {
    super()
  }
}

export class Bind<R, E, A, R1, E1, B> extends Layer<R & R1, E | E1, B> {
  readonly _tag = LayerTag.Bind

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => Layer<R1, E1, B>) {
    super()
  }
}

export class Fresh<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerTag.Fresh

  constructor(readonly layer: Layer<R, E, A>) {
    super()
  }
}

export class FromManaged<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerTag.FromManaged

  constructor(readonly managed: Managed<R, E, A>) {
    super()
  }
}

export class Defer<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerTag.Defer

  constructor(readonly factory: () => Layer<R, E, A>) {
    super()
  }
}

export type MergeR<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any>] ? (unknown extends X ? never : X) : never
  }[number]
>

export type MergeE<Ls extends Layer<any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any>] ? X : never
}[number]

export type MergeA<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X>] ? (unknown extends X ? never : X) : never
  }[number]
>

export class Map2Par<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerTag.Map2Par

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class AllPar<Ls extends Layer<any, any, any>[]> extends Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  readonly _tag = LayerTag.AllPar

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

export class Map2Seq<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerTag.Map2Seq

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class AllSeq<Ls extends Layer<any, any, any>[]> extends Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  readonly _tag = LayerTag.AllSeq

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

export type RIO<R, A> = Layer<R, never, A>

function scope<R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> {
  const _I = layer._I()

  switch (_I._tag) {
    case LayerTag.Fresh: {
      return M.succeed(() => build(_I.layer))
    }
    case LayerTag.FromManaged: {
      return M.succeed(() => _I.managed)
    }
    case LayerTag.Defer: {
      return M.succeed((memo) => memo.getOrElseMemoize(_I.factory()))
    }
    case LayerTag.FMap: {
      return M.succeed((memo) => M.map_(memo.getOrElseMemoize(_I.layer), _I.f))
    }
    case LayerTag.Bind: {
      return M.succeed((memo) => M.bind_(memo.getOrElseMemoize(_I.layer), (a) => memo.getOrElseMemoize(_I.f(a))))
    }
    case LayerTag.Map2Par: {
      return M.succeed((memo) => M.map2Par_(memo.getOrElseMemoize(_I.layer), memo.getOrElseMemoize(_I.that), _I.f))
    }
    case LayerTag.Map2Seq: {
      return M.succeed((memo) => M.map2_(memo.getOrElseMemoize(_I.layer), memo.getOrElseMemoize(_I.that), _I.f))
    }
    case LayerTag.AllPar: {
      return M.succeed((memo) => {
        return pipe(
          M.foreachPar_(_I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.foldl({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerTag.AllSeq: {
      return M.succeed((memo) => {
        return pipe(
          M.foreach_(_I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.foldl({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerTag.Fold: {
      return M.succeed((memo) =>
        M.foldCauseM_(
          memo.getOrElseMemoize(_I.layer),
          (e) =>
            pipe(
              I.toManaged()(I.ask<any>()),
              M.bind((r) => M.gives_(memo.getOrElseMemoize(_I.onFailure), () => tuple(r, e)))
            ),
          (r) =>
            M.gives_(memo.getOrElseMemoize(_I.onSuccess), (x) =>
              typeof x === 'object' && typeof r === 'object'
                ? {
                    ...x,
                    ...r
                  }
                : r
            )
        )
      )
    }
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Builds a layer into a managed value.
 */
export function build<R, E, A>(layer: Layer<R, E, A>): M.Managed<R, E, A> {
  return M.gen(function* (_) {
    const memoMap = yield* _(M.fromEffect(makeMemoMap()))
    const run     = yield* _(scope(layer))
    const value   = yield* _(run(memoMap))
    return value
  })
}

/**
 * Constructs a layer from the specified value.
 */
export function succeed<A>(tag: H.Tag<A>): (a: A) => Layer<unknown, never, H.Has<A>> {
  return (resource) => fromManaged(tag)(M.succeed(resource))
}

export function fail<E>(e: E): Layer<unknown, E, never> {
  return fromRawManaged(M.fail(e))
}

export function identity<R>(): Layer<R, never, R> {
  return fromRawManaged(M.ask<R>())
}

export function prepare<T>(tag: H.Tag<T>) {
  return <R, E, A extends T>(acquire: I.IO<R, E, A>) => ({
    open: <R1, E1>(open: (_: A) => I.IO<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => I.IO<R2, never, any>) =>
        fromManaged(tag)(
          M.bind_(
            M.makeExit_(acquire, (a) => release(a)),
            (a) => M.fromEffect(I.map_(open(a), () => a))
          )
        )
    }),
    release: <R2>(release: (_: A) => I.IO<R2, never, any>) => fromManaged(tag)(M.makeExit_(acquire, (a) => release(a)))
  })
}

export function create<T>(tag: H.Tag<T>) {
  return {
    fromEffect: fromEffect(tag),
    fromManaged: fromManaged(tag),
    pure: succeed(tag),
    prepare: prepare(tag)
  }
}

/**
 * Constructs a layer from the specified effect.
 */
export function fromEffect<T>(tag: H.Tag<T>): <R, E>(resource: I.IO<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => new FromManaged(M.bind_(M.fromEffect(resource), (a) => environmentFor(tag, a)))
}

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged<T>(has: H.Tag<T>): <R, E>(resource: Managed<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => new FromManaged(M.bind_(resource, (a) => environmentFor(has, a)))
}

export function fromRawManaged<R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> {
  return new FromManaged(resource)
}

export function fromRawEffect<R, E, A>(resource: I.IO<R, E, A>): Layer<R, E, A> {
  return new FromManaged(M.fromEffect(resource))
}

export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return fromRawEffect(I.asks(f))
}

export function fromRawFunctionM<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): Layer<R & A, E, B> {
  return fromRawEffect(I.asksM(f))
}

export function fromRawFunctionManaged<R0, R, E, A>(f: (r0: R0) => Managed<R, E, A>): Layer<R0 & R, E, A> {
  return fromRawManaged(M.asksManaged(f))
}

export function fromFunctionManaged<T>(
  tag: H.Tag<T>
): <A, R, E>(f: (a: A) => Managed<R, E, T>) => Layer<R & A, E, H.Has<T>> {
  return (f) => fromManaged(tag)(M.fromFunctionManaged(f))
}

export function fromFunctionM<T>(tag: H.Tag<T>): <A, R, E>(f: (a: A) => I.IO<R, E, T>) => Layer<R & A, E, H.Has<T>> {
  return <A, R, E>(f: (a: A) => I.IO<R, E, T>) => fromFunctionManaged(tag)((a: A) => I.toManaged_(f(a)))
}

export function fromConstructor<S>(
  tag: H.Tag<S>
): <Services extends any[]>(
  constructor: (...services: Services) => S
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]>,
  never,
  H.Has<S>
> {
  return (constructor) => (...tags) =>
    fromEffect(tag)(I.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as any) as any
}

export function fromEffectConstructor<S>(
  tag: H.Tag<S>
): <Services extends any[], R, E>(
  constructor: (...services: Services) => I.IO<R, E, S>
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R,
  E,
  H.Has<S>
> {
  return (constructor) => (...tags) =>
    fromEffect(tag)(I.asksServicesTM(...tags)((...services: any[]) => constructor(...(services as any))) as any) as any
}

export function fromManagedConstructor<S>(
  tag: H.Tag<S>
): <Services extends any[], R, E>(
  constructor: (...services: Services) => M.Managed<R, E, S>
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R,
  E,
  H.Has<S>
> {
  return (constructor) => (...tags) =>
    fromManaged(tag)(
      M.bind_(
        M.fromEffect(I.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any)))),
        (_) => _
      )
    )
}

export function bracketConstructor<S>(
  tag: H.Tag<S>
): <Services extends any[], S2 extends S>(
  constructor: (...services: Services) => S2
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => I.IO<R, E, unknown>,
  release: (s: S2) => I.IO<R2, never, unknown>
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R & R2,
  E,
  H.Has<S>
> {
  return (constructor) => (...tags) => (open, release) =>
    prepare(tag)(I.asksServicesT(...tags)((...services: any[]) => constructor(...(services as any))) as any)
      .open(open as any)
      .release(release as any) as any
}

export function bracketEffectConstructor<S>(
  tag: H.Tag<S>
): <Services extends any[], S2 extends S, R0, E0>(
  constructor: (...services: Services) => I.IO<R0, E0, S2>
) => (
  ...tags: { [k in keyof Services]: H.Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => I.IO<R, E, unknown>,
  release: (s: S2) => I.IO<R2, never, unknown>
) => Layer<
  UnionToIntersection<{ [k in keyof Services]: H.Has<Services[k]> }[keyof Services & number]> & R & R2 & R0,
  E0 | E,
  H.Has<S>
> {
  return (constructor) => (...tags) => (open, release) =>
    prepare(tag)(I.asksServicesTM(...tags)((...services: any[]) => constructor(...(services as any))) as any)
      .open(open as any)
      .release(release as any) as any
}

export function restrict<Tags extends H.Tag<any>[]>(
  ...ts: Tags
): <R, E>(
  layer: Layer<
    R,
    E,
    UnionToIntersection<{ [k in keyof Tags]: [Tags[k]] extends [H.Tag<infer A>] ? H.Has<A> : never }[number]>
  >
) => Layer<
  R,
  E,
  UnionToIntersection<{ [k in keyof Tags]: [Tags[k]] extends [H.Tag<infer A>] ? H.Has<A> : never }[number]>
> {
  return (layer) =>
    andTo_(
      layer,
      fromRawEffect(
        I.asksServicesT(...ts)((...servises) =>
          servises.map((s, i) => ({ [ts[i].key]: s } as any)).reduce((x, y) => ({ ...x, ...y }))
        )
      )
    ) as any
}

export function defer<R, E, A>(la: () => Layer<R, E, A>): Layer<R, E, A> {
  return new Defer(la)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function map2_<R, E, A, R1, E1, B, C>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): Layer<R & R1, E | E1, C> {
  return new Map2Seq(fa, fb, f)
}

export function map2<A, R1, E1, B, C>(
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Layer<R, E, A>) => Layer<R & R1, E | E1, C> {
  return (fa) => map2_(fa, fb, f)
}

export function product_<R, E, A, R1, E1, B>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>
): Layer<R & R1, E | E1, readonly [A, B]> {
  return new Map2Seq(fa, fb, tuple)
}

export function product<R1, E1, B>(
  right: Layer<R1, E1, B>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E | E1, readonly [A, B]> {
  return (left) => product_(left, right)
}

export function ap_<R, E, A, R1, E1, B>(fab: Layer<R, E, (a: A) => B>, fa: Layer<R1, E1, A>): Layer<R & R1, E | E1, B> {
  return map2_(fab, fa, (f, a) => f(a))
}

export function ap<R1, E1, A>(
  fa: Layer<R1, E1, A>
): <R, E, B>(fab: Layer<R, E, (a: A) => B>) => Layer<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------
 * Apply Par
 * -------------------------------------------
 */

export function map2Par_<R, E, A, R1, E1, B, C>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): Layer<R & R1, E | E1, C> {
  return new Map2Par(fa, fb, f)
}

export function map2Par<A, R1, E1, B, C>(
  fb: Layer<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Layer<R, E, A>) => Layer<R & R1, E | E1, C> {
  return (fa) => map2Par_(fa, fb, f)
}

export function productPar_<R, E, A, R1, E1, B>(
  fa: Layer<R, E, A>,
  fb: Layer<R1, E1, B>
): Layer<R & R1, E | E1, readonly [A, B]> {
  return map2Par_(fa, fb, tuple)
}

export function productPar<R1, E1, B>(
  right: Layer<R1, E1, B>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E | E1, readonly [A, B]> {
  return (left) => product_(left, right)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Layer<R, E, (a: A) => B>,
  fa: Layer<R1, E1, A>
): Layer<R & R1, E | E1, B> {
  return map2_(fab, fa, (f, a) => f(a))
}

export function apPar<R1, E1, A>(
  fa: Layer<R1, E1, A>
): <R, E, B>(fab: Layer<R, E, (a: A) => B>) => Layer<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function mapError_<R, E, A, E1>(la: Layer<R, E, A>, f: (e: E) => E1): Layer<R, E1, A> {
  return catchAll_(la, second<E>()['>>'](fromRawFunctionM((e: E) => I.fail(f(e)))))
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(la: Layer<R, E, A>) => Layer<R, E1, A> {
  return (la) => mapError_(la, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Returns a new layer whose output is mapped by the specified function.
 */
export function map_<R, E, A, B>(fa: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B> {
  return new FMap(fa, f)
}

/**
 * Returns a new layer whose output is mapped by the specified function.
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Layer<R, E, A>) => Layer<R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<R, E, A, R1, E1, B>(ma: Layer<R, E, A>, f: (a: A) => Layer<R1, E1, B>): Layer<R & R1, E | E1, B> {
  return new Bind(ma, f)
}

export function bind<A, R1, E1, B>(
  f: (a: A) => Layer<R1, E1, B>
): <R, E>(ma: Layer<R, E, A>) => Layer<R & R1, E1 | E, B> {
  return (ma) => bind_(ma, f)
}

export function flatten<R, E, R1, E1, A>(mma: Layer<R, E, Layer<R1, E1, A>>): Layer<R & R1, E | E1, A> {
  return bind_(mma, (_) => _)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function all<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new AllPar(ls)
}

export function allPar<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new AllSeq(ls)
}

/**
 * Combines both layers, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function and_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new Map2Par(left, right, (l, r) => ({ ...l, ...r }))
}

/**
 * Combines both layers, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function and<R1, E1, A1>(
  right: Layer<R1, E1, A1>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (left) => and_(left, right)
}

/**
 * Feeds the output services of the `left` layer into the input of the `right` layer,
 * resulting in a new layer with the inputs of the `left` layer, and the
 * outputs of both layers.
 */
export function andTo<R, E, A>(
  right: Layer<R, E, A>
): <R1, E1, A1>(left: Layer<R1, E1, A1>) => Layer<R1 & Erase<R & R1, A1>, E | E1, A & A1> {
  return <R1, E1, A1>(left: Layer<R1, E1, A1>) => andTo_(left, right)
}

/**
 * Feeds the output services of the `left` layer into the input of the `right` layer,
 * resulting in a new layer with the inputs of the `left` layer, and the
 * outputs of both layers.
 */
export function andTo_<R, E, A, R1, E1, A1>(
  left: Layer<R1, E1, A1>,
  right: Layer<R, E, A>
): Layer<R1 & Erase<R & R1, A1>, E | E1, A & A1> {
  return fold_(
    left,
    fromRawFunctionM((_: readonly [R1 & Erase<R & R1, A1>, Cause<E1>]) => I.halt(_[1])),
    and_(left, right)
  )
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function andSeq_<R, E, A, R1, E1, A1>(
  layer: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A & A1> {
  return new Map2Seq(layer, that, (l, r) => ({ ...l, ...r }))
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers.
 */
export function andSeq<R1, E1, A1>(
  that: Layer<R1, E1, A1>
): <R, E, A>(layer: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (layer) => andSeq_(layer, that)
}

function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, H.Has<T>>
function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, any> {
  return M.fromEffect(
    I.asks((r) => ({
      [has.key]: mergeEnvironments(has, r, a as any)[has.key]
    }))
  )
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  la: Layer<R, E, A>,
  handler: Layer<readonly [R1, E], E1, B>
): Layer<R & R1, E1, A | B> {
  const failureOrDie: Layer<readonly [R1, Cause<E>], never, readonly [R1, E]> = fromRawFunctionM(
    (_: readonly [R1, Cause<E>]) =>
      pipe(
        _[1],
        Ca.failureOrCause,
        E.fold(
          (e) => I.succeed(tuple(_[0], e)),
          (c) => I.halt(c)
        )
      )
  )
  return fold_(la, failureOrDie['>>>'](handler), identity(), 'no-erase')
}

/**
 * Recovers from all errors.
 */
export function catchAll<E, R1, E1, B>(
  handler: Layer<readonly [R1, E], E1, B>
): <R, A>(la: Layer<R, E, A>) => Layer<R & R1, E1, A | B> {
  return (la) => catchAll_(la, handler)
}

/**
 * Builds this layer and uses it until it is interrupted. This is useful when
 * your entire application is a layer, such as an HTTP server.
 */
export function launch<E, A>(la: Layer<unknown, E, A>): I.FIO<E, never> {
  return pipe(la, build, M.useForever)
}

export function first<A>(): Layer<readonly [A, any], never, A> {
  return fromRawFunction(([a, _]) => a)
}

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export function fresh<R, E, A>(layer: Layer<R, E, A>): Layer<R, E, A> {
  return new Fresh(layer)
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 */
export function from_<R, E, A, R2, E2, A2>(
  to: Layer<R & A2, E, A>,
  from: Layer<R2, E2, A2>,
  noErase: 'no-erase'
): Layer<R & R2, E | E2, A>
export function from_<R, E, A, R2, E2, A2>(
  to: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A>
export function from_<R, E, A, R2, E2, A2>(
  to: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_(
    from,
    fromRawFunctionM((_: readonly [Erase<R, A2> & R2, Cause<E2>]) => I.halt(_[1])),
    to
  )
}

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 */
export function fold_<R, E, A, R1, E1, B, E2, C>(
  layer: Layer<R, E, A>,
  onFailure: Layer<readonly [R1, Cause<E>], E1, B>,
  onSuccess: Layer<A, E2, C>,
  noErase: 'no-erase'
): Layer<R & R1, E1 | E2, B | C>
export function fold_<R, E, A, R1, E1, B, R2, E2, C>(
  layer: Layer<R, E, A>,
  onFailure: Layer<readonly [R1, Cause<E>], E1, B>,
  onSuccess: Layer<R2, E2, C>
): Layer<R & R1 & Erase<R2, A>, E1 | E2, B | C>
export function fold_<R, E, A, R1, E1, B, R2, E2, C>(
  layer: Layer<R, E, A>,
  onFailure: Layer<readonly [R1, Cause<E>], E1, B>,
  onSuccess: Layer<R2, E2, C>
): Layer<R & R1 & Erase<R2, A>, E1 | E2, B | C> {
  return new Fold<R, E, A, R1, E1, B, R2, E2, C>(layer, onFailure, onSuccess)
}

/**
 * Returns a managed effect that, if evaluated, will return the lazily
 * computed result of this layer.
 */
export function memoize<R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, Layer<R, E, A>> {
  return M.map_(M.memoize(build(layer)), (_) => fromRawManaged(_))
}

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 */
export function orDie<R, E extends Error, A>(la: Layer<R, E, A>): Layer<R, never, A> {
  return catchAll_(la, second<E>()['>>'](fromRawFunctionM((e: E) => I.die(e))))
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 */
export function orElse_<R, E, A, R1, E1, A1>(
  la: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A | A1> {
  return catchAll_(la, to_(first<R1>(), that, 'no-erase'))
}

export function orElse<R1, E1, A1>(
  that: Layer<R1, E1, A1>
): <R, E, A>(la: Layer<R, E, A>) => Layer<R & R1, E | E1, A | A1> {
  return (la) => orElse_(la, that)
}

/**
 * Retries constructing this layer according to the specified schedule.
 */
export function retry_<R, E, A, R1>(
  la: Layer<R, E, A>,
  schedule: Schedule<R1, E, any>
): Layer<R & R1 & H.Has<Clock>, E, A> {
  type S = StepFunction<R1, E, any>

  const update: Layer<
    readonly [readonly [R & R1 & H.Has<Clock>, S], E],
    E,
    readonly [R & R1 & H.Has<Clock>, S]
  > = fromRawFunctionM(([[r, s], e]: readonly [readonly [R & R1 & H.Has<Clock>, S], E]) =>
    pipe(
      currentTime,
      I.orDie,
      I.bind((now) =>
        pipe(
          s(now, e),
          I.bind(
            matchTag({
              Done: (_) => I.fail(e),
              Continue: (c) => I.as_(sleep(c.interval), () => tuple(r, c.next))
            })
          )
        )
      ),
      I.giveAll(r)
    )
  )

  const loop = (): Layer<readonly [R & R1 & H.Has<Clock>, S], E, A> =>
    pipe(first<R>()['>>'](la), catchAll(update['>>'](defer(loop))))

  return identity<R & R1 & H.Has<Clock>>()
    ['<&>'](fromRawEffect(I.succeed(schedule.step)))
    ['>>'](loop())
}

/**
 * Retries constructing this layer according to the specified schedule.
 */
export function retry<R1, E>(
  schedule: Schedule<R1, E, any>
): <R, A>(la: Layer<R, E, A>) => Layer<R & R1 & H.Has<Clock>, E, A> {
  return (la) => retry_(la, schedule)
}

/**
 * Embed the requird environment in a region
 */
export function region<K, T>(
  h: H.Tag<H.Region<T, K>>
): <R, E>(_: Layer<R, E, T>) => Layer<R, E, H.Has<H.Region<T, K>>> {
  return (_) =>
    pipe(fromRawEffect(I.asks((r: T): H.Has<H.Region<T, K>> => ({ [h.key]: r } as any))), using(_, 'no-erase'))
}

export function second<A>(): Layer<readonly [any, A], never, A> {
  return fromRawFunction(([_, a]) => a)
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 */
export function to<R, E, A>(
  from: Layer<R, E, A>
): <R2, E2, A2>(to: Layer<R2, E2, A2>) => Layer<Erase<R, A2> & R2, E | E2, A> {
  return (to) => to_(to, from)
}

/**
 * Feeds the output services of the `from` layer into the input of the `to` layer
 * layer, resulting in a new layer with the inputs of the `from`, and the
 * outputs of the `to` layer.
 */
export function to_<R, E, A, R2, E2, A2>(
  from: Layer<R2, E2, A2>,
  to: Layer<A2, E, A>,
  noErase: 'no-erase'
): Layer<R2, E | E2, A>
export function to_<R, E, A, R2, E2, A2>(
  from: Layer<R2, E2, A2>,
  to: Layer<R, E, A>
): Layer<Erase<R, A2> & R2, E | E2, A>
export function to_<R, E, A, R2, E2, A2>(
  from: Layer<R2, E2, A2>,
  to: Layer<R, E, A>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_(
    from,
    fromRawFunctionM((_: readonly [Erase<R, A2> & R2, Cause<E2>]) => I.halt(_[1])),
    to
  )
}

/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, Runtime<A>> {
  return M.map_(build(_), makeRuntime)
}

/**
 * Updates one of the services output by this layer.
 */
export function update_<T>(
  tag: H.Tag<T>
): <R, E, A extends H.Has<T>>(la: Layer<R, E, A>, f: (a: T) => T) => Layer<R, E, A> {
  return <R, E, A extends H.Has<T>>(la: Layer<R, E, A>, f: (_: T) => T) =>
    la['>>'](fromRawEffect(pipe(I.ask<A>(), I.updateService(tag, f))))
}

/**
 * Updates one of the services output by this layer.
 */
export function update<T>(
  tag: H.Tag<T>
): (f: (_: T) => T) => <R, E, A extends H.Has<T>>(la: Layer<R, E, A>) => Layer<R, E, A> {
  return (f) => (la) => update_(tag)(la, f)
}

/**
 * Feeds the output services of the `right` layer into the input of the `left` layer,
 * resulting in a new layer with the inputs of the `right` layer, and the
 * outputs of both layers.
 */
export function using<R2, E2, A2>(
  right: Layer<R2, E2, A2>,
  noErase: 'no-erase'
): <R, E, A>(left: Layer<R & A2, E, A>) => Layer<R & R2, E | E2, A & A2>
export function using<R2, E2, A2>(
  right: Layer<R2, E2, A2>
): <R, E, A>(left: Layer<R, E, A>) => Layer<Erase<R & R2, A2> & R2, E | E2, A & A2>
export function using<R2, E2, A2>(
  right: Layer<R2, E2, A2>
): <R, E, A>(left: Layer<R, E, A>) => Layer<Erase<R & R2, A2> & R2, E | E2, A & A2> {
  return (left) => using_(left, right)
}

/**
 * Feeds the output services of the `right` layer into the input of the `left` layer,
 * resulting in a new layer with the inputs of the `right` layer, and the
 * outputs of both layers.
 */
export function using_<R, E, A, R2, E2, A2>(
  left: Layer<R & A2, E, A>,
  right: Layer<R2, E2, A2>,
  noErase: 'no-erase'
): Layer<R & R2, E | E2, A & A2>
export function using_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<Erase<R & R2, A2> & R2, E | E2, A & A2>
export function using_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<Erase<R & R2, A2> & R2, E | E2, A & A2> {
  return fold_(
    right,
    fromRawFunctionM((_: readonly [Erase<R, A2> & R2, Cause<E2>]) => I.halt(_[1])),
    and_(right, left)
  )
}

/*
 * -------------------------------------------
 * MemoMap
 * -------------------------------------------
 */

/**
 * A `MemoMap` memoizes dependencies.
 */

export class MemoMap {
  constructor(readonly ref: XRM.URefM<ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>>) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) => {
    const self = this
    return new M.Managed<R, E, A>(
      pipe(
        this.ref,
        XRM.modify((m) => {
          const inMap = m.get(layer.hash.get)

          if (inMap) {
            const [acquire, release] = inMap

            const cached = I.asksM(([_, rm]: readonly [R, ReleaseMap]) =>
              pipe(
                acquire as I.FIO<E, A>,
                I.onExit((ex) => {
                  switch (ex._tag) {
                    case 'Success': {
                      return RelMap.add(release)(rm)
                    }
                    case 'Failure': {
                      return I.unit()
                    }
                  }
                }),
                I.map((x) => [release, x] as readonly [Finalizer, A])
              )
            )

            return I.pure(tuple(cached, m))
          } else {
            return I.gen(function* (_) {
              const observers    = yield* _(XR.make(0))
              const promise      = yield* _(P.make<E, A>())
              const finalizerRef = yield* _(XR.make<Finalizer>(RelMap.noopFinalizer))

              const resource = I.uninterruptibleMask(({ restore }) =>
                I.gen(function* (_) {
                  const env                  = yield* _(I.ask<readonly [R, ReleaseMap]>())
                  const [a, outerReleaseMap] = env
                  const innerReleaseMap      = yield* _(RelMap.make)
                  const tp                   = yield* _(
                    pipe(
                      scope(layer),
                      M.bind((_) => _(self)),
                      (_) => _.io,
                      I.giveAll(tuple(a, innerReleaseMap)),
                      I.result,
                      I.bind((ex) =>
                        Ex.fold_(
                          ex,
                          (cause): I.IO<unknown, E, readonly [Finalizer, A]> =>
                            pipe(
                              promise.halt(cause),
                              I.bind(() => M.releaseAll(ex, sequential)(innerReleaseMap) as I.FIO<E, any>),
                              I.bind(() => I.halt(cause))
                            ),
                          ([fin, a]) =>
                            I.gen(function* (_) {
                              yield* _(
                                pipe(
                                  finalizerRef.set((e) => M.releaseAll(e, sequential)(innerReleaseMap)),
                                  I.whenM(XR.modify_(observers, (n) => [n === 1, n - 1]))
                                )
                              )
                              yield* _(XR.update_(observers, (n) => n + 1))
                              const outerFinalizer = yield* _(
                                RelMap.add((e) => I.bind_(finalizerRef.get, (f) => f(e)))(outerReleaseMap)
                              )
                              yield* _(promise.succeed(a))
                              return tuple(outerFinalizer, a)
                            })
                        )
                      ),
                      restore
                    )
                  )
                  return tp
                })
              )

              const memoized = tuple(
                pipe(
                  promise.await,
                  I.onExit(
                    Ex.fold(
                      (_) => I.unit(),
                      (_) => XR.update_(observers, (n) => n + 1)
                    )
                  )
                ),
                (ex: Exit<any, any>) => I.bind_(finalizerRef.get, (f) => f(ex))
              )

              return tuple(
                resource as I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>,
                insert(layer.hash.get, memoized)(m) as ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>
              )
            })
          }
        }),
        I.flatten
      )
    )
  }
}

export const HasMemoMap = tag(MemoMap)
export type HasMemoMap = H.HasTag<typeof HasMemoMap>

export function makeMemoMap() {
  return pipe(
    XRM.make<ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>>(new Map()),
    I.bind((r) => I.effectTotal(() => new MemoMap(r)))
  )
}
