import type { Cause } from '../Cause'
import type { Exit } from '../Exit'
import type { DefaultEnv, Runtime } from '../IO/combinators/runtime'
import type { Managed } from '../Managed/core'
import type { Finalizer, ReleaseMap } from '../Managed/ReleaseMap'
import type * as H from '@principia/base/data/Has'
import type { Erase, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/data/Array'
import { pipe, tuple } from '@principia/base/data/Function'
import { mergeEnvironments, tag } from '@principia/base/data/Has'
import { insert } from '@principia/base/data/Map'
import { AtomicReference } from '@principia/base/util/support/AtomicReference'

import { sequential } from '../ExecutionStrategy'
import { makeRuntime } from '../IO/combinators/runtime'
import * as XR from '../IORef'
import * as XRM from '../IORefM'
import * as RelMap from '../Managed/ReleaseMap'
import * as XP from '../Promise'
import * as I from './_internal/io'
import * as M from './_internal/managed'

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

  ['<<<']<R1, E1, A1>(from: Layer<R1, E1, A1>): Layer<Erase<R, A1> & R1, E | E1, A> {
    return from_(this, from)
  }

  ['>>>']<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<Erase<R1, A> & R, E | E1, A1> {
    return from_(to, this)
  }

  ['<+<']<R1, E1, A1>(from: Layer<R1, E1, A1>): Layer<Erase<R, A1> & R1, E | E1, A & A1> {
    return using_(this, from)
  }

  ['>+>']<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<Erase<R1, A> & R, E | E1, A & A1> {
    return using_(to, this)
  }

  ['+++']<R1, E1, A1>(and: Layer<R1, E1, A1>): Layer<R & R1, E | E1, A & A1> {
    return and_(and, this)
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

export enum LayerInstructionTag {
  Fold = 'LayerFold',
  Map = 'LayerMap',
  Chain = 'LayerChain',
  Fresh = 'LayerRefresh',
  Managed = 'LayerManaged',
  Suspend = 'LayerSuspend',
  ZipWithPar = 'LayerZipWithPar',
  AllPar = 'LayerAllPar',
  AllSeq = 'LayerAllSeq',
  ZipWithSeq = 'LayerZipWithSeq'
}

/**
 * Type level bound to make sure a layer is complete
 */
export function main<E, A>(layer: Layer<DefaultEnv, E, A>) {
  return layer
}

export type LayerInstruction =
  | LayerFoldInstruction<any, any, any, any, any, any, any, any>
  | LayerMapInstruction<any, any, any, any>
  | LayerChainInstruction<any, any, any, any, any, any>
  | LayerChainInstruction<any, any, any, any, any, any>
  | LayerFreshInstruction<any, any, any>
  | LayerManagedInstruction<any, any, any>
  | LayerSuspendInstruction<any, any, any>
  | LayerZipWithParInstruction<any, any, any, any, any, any, any>
  | LayerZipWithSeqInstruction<any, any, any, any, any, any, any>
  | LayerAllParInstruction<Layer<any, any, any>[]>
  | LayerAllSeqInstruction<Layer<any, any, any>[]>

export class LayerFoldInstruction<R, E, A, E1, A1, R2, E2, A2> extends Layer<R & R2, E1 | E2, A1 | A2> {
  readonly _tag = LayerInstructionTag.Fold

  constructor(
    readonly layer: Layer<R, E, A>,
    readonly onFailure: Layer<readonly [R, Cause<E>], E1, A1>,
    readonly onSuccess: Layer<A & R2, E2, A2>
  ) {
    super()
  }
}

export class LayerMapInstruction<R, E, A, B> extends Layer<R, E, B> {
  readonly _tag = LayerInstructionTag.Map

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => B) {
    super()
  }
}

export class LayerChainInstruction<R, E, A, R1, E1, B> extends Layer<R & R1, E | E1, B> {
  readonly _tag = LayerInstructionTag.Chain

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => Layer<R1, E1, B>) {
    super()
  }
}

export class LayerFreshInstruction<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerInstructionTag.Fresh

  constructor(readonly layer: Layer<R, E, A>) {
    super()
  }
}

export class LayerManagedInstruction<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerInstructionTag.Managed

  constructor(readonly managed: Managed<R, E, A>) {
    super()
  }
}

export class LayerSuspendInstruction<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerInstructionTag.Suspend

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

export class LayerZipWithParInstruction<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerInstructionTag.ZipWithPar

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class LayerAllParInstruction<Ls extends Layer<any, any, any>[]> extends Layer<
  MergeR<Ls>,
  MergeE<Ls>,
  MergeA<Ls>
> {
  readonly _tag = LayerInstructionTag.AllPar

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

export class LayerZipWithSeqInstruction<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerInstructionTag.ZipWithSeq

  constructor(readonly layer: Layer<R, E, A>, readonly that: Layer<R1, E1, B>, readonly f: (a: A, b: B) => C) {
    super()
  }
}

export class LayerAllSeqInstruction<Ls extends Layer<any, any, any>[]> extends Layer<
  MergeR<Ls>,
  MergeE<Ls>,
  MergeA<Ls>
> {
  readonly _tag = LayerInstructionTag.AllSeq

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super()
  }
}

export type RIO<R, A> = Layer<R, never, A>

function _build<R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> {
  const _I = layer._I()

  switch (_I._tag) {
    case LayerInstructionTag.Fresh: {
      return M.succeed(() => build(_I.layer))
    }
    case LayerInstructionTag.Managed: {
      return M.succeed(() => _I.managed)
    }
    case LayerInstructionTag.Suspend: {
      return M.succeed((memo) => memo.getOrElseMemoize(_I.factory()))
    }
    case LayerInstructionTag.Map: {
      return M.succeed((memo) => M.map_(memo.getOrElseMemoize(_I.layer), _I.f))
    }
    case LayerInstructionTag.Chain: {
      return M.succeed((memo) => M.flatMap_(memo.getOrElseMemoize(_I.layer), (a) => memo.getOrElseMemoize(_I.f(a))))
    }
    case LayerInstructionTag.ZipWithPar: {
      return M.succeed((memo) => M.zipWithPar_(memo.getOrElseMemoize(_I.layer), memo.getOrElseMemoize(_I.that), _I.f))
    }
    case LayerInstructionTag.ZipWithSeq: {
      return M.succeed((memo) => M.map2_(memo.getOrElseMemoize(_I.layer), memo.getOrElseMemoize(_I.that), _I.f))
    }
    case LayerInstructionTag.AllPar: {
      return M.succeed((memo) => {
        return pipe(
          M.foreachPar_(_I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.foldLeft({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerInstructionTag.AllSeq: {
      return M.succeed((memo) => {
        return pipe(
          M.foreach_(_I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.foldLeft({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case LayerInstructionTag.Fold: {
      return M.succeed((memo) =>
        M.foldCauseM_(
          memo.getOrElseMemoize(_I.layer),
          (e) =>
            pipe(
              I.toManaged()(I.ask<any>()),
              M.flatMap((r) => M.gives_(memo.getOrElseMemoize(_I.onFailure), () => tuple(r, e)))
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

export function build<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, A> {
  return pipe(
    M.do,
    M.bindS('memoMap', () => M.fromEffect(makeMemoMap())),
    M.bindS('run', () => _build(_)),
    M.bindS('value', ({ memoMap, run }) => run(memoMap)),
    M.map(({ value }) => value)
  )
}

export function pure<T>(has: H.Tag<T>): (resource: T) => Layer<unknown, never, H.Has<T>> {
  return (resource) =>
    new LayerManagedInstruction(M.flatMap_(M.fromEffect(I.pure(resource)), (a) => environmentFor(has, a)))
}

export function identity<R>(): Layer<R, never, R> {
  return fromRawManaged(M.ask<R>())
}

export function prepare<T>(has: H.Tag<T>) {
  return <R, E, A extends T>(acquire: I.IO<R, E, A>) => ({
    open: <R1, E1>(open: (_: A) => I.IO<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => I.IO<R2, never, any>) =>
        fromManaged(has)(
          M.flatMap_(
            M.makeExit_(acquire, (a) => release(a)),
            (a) => M.fromEffect(I.map_(open(a), () => a))
          )
        )
    }),
    release: <R2>(release: (_: A) => I.IO<R2, never, any>) => fromManaged(has)(M.makeExit_(acquire, (a) => release(a)))
  })
}

export function create<T>(has: H.Tag<T>) {
  return {
    fromEffect: fromEffect(has),
    fromManaged: fromManaged(has),
    pure: pure(has),
    prepare: prepare(has)
  }
}

export function fromEffect<T>(has: H.Tag<T>): <R, E>(resource: I.IO<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => new LayerManagedInstruction(M.flatMap_(M.fromEffect(resource), (a) => environmentFor(has, a)))
}

export function fromManaged<T>(has: H.Tag<T>): <R, E>(resource: Managed<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) => new LayerManagedInstruction(M.flatMap_(resource, (a) => environmentFor(has, a)))
}

export function fromRawManaged<R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> {
  return new LayerManagedInstruction(resource)
}

export function fromRawEffect<R, E, A>(resource: I.IO<R, E, A>): Layer<R, E, A> {
  return new LayerManagedInstruction(M.fromEffect(resource))
}

export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return fromRawEffect(I.asks(f))
}

export function fromRawFunctionM<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): Layer<R & A, E, B> {
  return fromRawEffect(I.asksM(f))
}

export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R & A2, E, A>,
  from: Layer<R2, E2, A2>,
  noErase: 'no-erase'
): Layer<R & R2, E | E2, A & A2>
export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2>
export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A2 & A>(
    from,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => I.halt(_[1])),
    and_(from, self)
  )
}

export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R & A2, E, A>,
  to: Layer<R2, E2, A2>,
  noErase: 'no-erase'
): Layer<R & R2, E | E2, A>
export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  to: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A>
export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  to: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A>(
    to,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => I.halt(_[1])),
    self
  )
}

export function both_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, readonly [A, A2]> {
  return new LayerZipWithSeqInstruction(left, right, tuple)
}

export function both<R2, E2, A2>(
  right: Layer<R2, E2, A2>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R2, E2 | E, readonly [A, A2]> {
  return (left) => both_(left, right)
}

export function and_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new LayerZipWithParInstruction(left, right, (l, r) => ({ ...l, ...r }))
}

export function and<R2, E2, A2>(
  right: Layer<R2, E2, A2>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R2, E2 | E, A & A2> {
  return (left) => and_(left, right)
}

export function fold_<R, E, A, E1, B, R2, E2, C>(
  layer: Layer<R, E, A>,
  onFailure: Layer<readonly [R, Cause<E>], E1, B>,
  onSuccess: Layer<A & R2, E2, C>
): Layer<R & R2, E1 | E2, B | C> {
  return new LayerFoldInstruction<R, E, A, E1, B, R2, E2, C>(layer, onFailure, onSuccess)
}

export function andTo<R1, E1, A1>(
  right: Layer<R1, E1, A1>,
  noErase: 'no-erase'
): <R, E, A>(left: Layer<R & A1, E, A>) => Layer<R & R1, E | E1, A & A1>
export function andTo<R1, E1, A1>(
  right: Layer<R1, E1, A1>
): <R, E, A>(left: Layer<R, E, A>) => Layer<Erase<R, A1> & R1, E | E1, A & A1>
export function andTo<R1, E1, A1>(
  right: Layer<R1, E1, A1>
): <R, E, A>(left: Layer<R, E, A>) => Layer<Erase<R, A1> & R1, E | E1, A & A1> {
  return (left) => andTo_(left, right)
}

export function andTo_<R, E, A, R1, E1, A1>(
  left: Layer<R, E, A>,
  right: Layer<R1, E1, A1>,
  noErase: 'no-erase'
): Layer<R & R1, E | E1, A & A1>
export function andTo_<R, E, A, R1, E1, A1>(
  left: Layer<R, E, A>,
  right: Layer<R1, E1, A1>
): Layer<Erase<R, A1> & R1, E | E1, A & A1>
export function andTo_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A2 & A>(
    right,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => I.halt(_[1])),
    and_(right, left)
  )
}

export function to<R, E, A>(
  to: Layer<R, E, A>
): <R2, E2, A2>(layer: Layer<R2, E2, A2>) => Layer<Erase<R, A2> & R2, E | E2, A> {
  return (layer) => to_(layer, to)
}

export function to_<R, E, A, R2, E2, A2>(
  layer: Layer<R2, E2, A2>,
  to: Layer<R, E, A>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A>(
    layer,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => I.halt(_[1])),
    to
  )
}

export function andSeq_<R, E, A, R1, E1, A1>(
  layer: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A & A1> {
  return new LayerZipWithSeqInstruction(layer, that, (l, r) => ({ ...l, ...r }))
}

export function andSeq<R1, E1, A1>(
  that: Layer<R1, E1, A1>
): <R, E, A>(layer: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (layer) => andSeq_(layer, that)
}

export function all<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new LayerAllParInstruction(ls)
}

export function allPar<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new LayerAllSeqInstruction(ls)
}

function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, H.Has<T>>
function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, any> {
  return M.fromEffect(
    I.asks((r) => ({
      [has.key]: mergeEnvironments(has, r, a as any)[has.key]
    }))
  )
}

export function memoize<R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, Layer<R, E, A>> {
  return M.map_(M.memoize(build(layer)), (_) => fromRawManaged(_))
}

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
  getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) =>
    new M.Managed<R, E, A>(
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
            return pipe(
              I.do,
              I.bindS('observers', () => XR.make(0)),
              I.bindS('promise', () => XP.make<E, A>()),
              I.bindS('finalizerRef', () => XR.make<Finalizer>(RelMap.noopFinalizer)),
              I.letS('resource', ({ finalizerRef, observers, promise }) =>
                I.uninterruptibleMask(({ restore }) =>
                  pipe(
                    I.do,
                    I.bindS('env', () => I.ask<readonly [R, ReleaseMap]>()),
                    I.letS('a', ({ env: [a] }) => a),
                    I.letS('outerReleaseMap', ({ env: [_, outerReleaseMap] }) => outerReleaseMap),
                    I.bindS('innerReleaseMap', () => RelMap.make),
                    I.bindS('tp', ({ a, innerReleaseMap, outerReleaseMap }) =>
                      restore(
                        pipe(
                          I.giveAll_(
                            pipe(
                              _build(layer),
                              M.flatMap((_) => _(this))
                            ).io,
                            [a, innerReleaseMap]
                          ),
                          I.result,
                          I.flatMap((e) => {
                            switch (e._tag) {
                              case 'Failure': {
                                return pipe(
                                  promise,
                                  XP.halt(e.cause),
                                  I.flatMap(() => M.releaseAll(e, sequential)(innerReleaseMap) as I.FIO<E, any>),
                                  I.flatMap(() => I.halt(e.cause))
                                )
                              }
                              case 'Success': {
                                return pipe(
                                  I.do,
                                  I.tap(() =>
                                    finalizerRef.set((e) =>
                                      I.whenM(
                                        pipe(
                                          observers,
                                          XR.modify((n) => [n === 1, n - 1])
                                        )
                                      )(M.releaseAll(e, sequential)(innerReleaseMap) as I.UIO<any>)
                                    )
                                  ),
                                  I.tap(() =>
                                    pipe(
                                      observers,
                                      XR.update((n) => n + 1)
                                    )
                                  ),
                                  I.bindS('outerFinalizer', () =>
                                    RelMap.add((e) => I.flatMap_(finalizerRef.get, (f) => f(e)))(outerReleaseMap)
                                  ),
                                  I.tap(() => pipe(promise, XP.succeed(e.value[1]))),
                                  I.map(({ outerFinalizer }) => tuple(outerFinalizer, e.value[1]))
                                )
                              }
                            }
                          })
                        )
                      )
                    ),
                    I.map(({ tp }) => tp)
                  )
                )
              ),
              I.letS(
                'memoized',
                ({ finalizerRef, observers, promise }) =>
                  [
                    pipe(
                      promise,
                      XP.await,
                      I.onExit((e) => {
                        switch (e._tag) {
                          case 'Failure': {
                            return I.unit()
                          }
                          case 'Success': {
                            return pipe(
                              observers,
                              XR.update((n) => n + 1)
                            )
                          }
                        }
                      })
                    ),
                    (e: Exit<any, any>) => I.flatMap_(finalizerRef.get, (f) => f(e))
                  ] as readonly [I.FIO<any, any>, Finalizer]
              ),
              I.map(({ memoized, resource }) =>
                tuple(
                  resource as I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>,
                  insert(layer.hash.get, memoized)(m) as ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>
                )
              )
            )
          }
        }),
        I.flatten
      )
    )
}

export const HasMemoMap = tag(MemoMap)
export type HasMemoMap = H.HasTag<typeof HasMemoMap>

export function makeMemoMap() {
  return pipe(
    XRM.make<ReadonlyMap<PropertyKey, readonly [I.FIO<any, any>, Finalizer]>>(new Map()),
    I.flatMap((r) => I.total(() => new MemoMap(r)))
  )
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

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
      M.flatMap_(
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

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<R, E, A, B>(fa: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B> {
  return new LayerMapInstruction(fa, f)
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: Layer<R, E, A>) => Layer<R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function flatMap_<R, E, A, R1, E1, B>(
  ma: Layer<R, E, A>,
  f: (a: A) => Layer<R1, E1, B>
): Layer<R & R1, E | E1, B> {
  return new LayerChainInstruction(ma, f)
}

export function flatMap<A, R1, E1, B>(
  f: (a: A) => Layer<R1, E1, B>
): <R, E>(ma: Layer<R, E, A>) => Layer<R & R1, E1 | E, B> {
  return (ma) => flatMap_(ma, f)
}

export function flatten<R, E, R1, E1, A>(mma: Layer<R, E, Layer<R1, E1, A>>): Layer<R & R1, E | E1, A> {
  return flatMap_(mma, (_) => _)
}

/**
 * Embed the requird environment in a region
 */
export function region<K, T>(
  h: H.Tag<H.Region<T, K>>
): <R, E>(_: Layer<R, E, T>) => Layer<R, E, H.Has<H.Region<T, K>>> {
  return (_) =>
    pipe(fromRawEffect(I.asks((r: T): H.Has<H.Region<T, K>> => ({ [h.key]: r } as any))), andTo(_, 'no-erase'))
}

/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, Runtime<A>> {
  return M.map_(build(_), makeRuntime)
}

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export function fresh<R, E, A>(layer: Layer<R, E, A>): Layer<R, E, A> {
  return new LayerFreshInstruction(layer)
}
