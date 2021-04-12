/**
 * Ported from https://github.com/zio/zio-prelude/blob/master/core/shared/src/main/scala/zio/prelude/fx/ZPure.scala
 */
import type { Eq } from './Eq'
import type { FreeSemiring } from './FreeSemiring'
import type * as HKT from './HKT'
import type { Predicate } from './Predicate'
import type { Stack } from './util/support/Stack'

import * as A from './Array'
import * as E from './Either'
import * as FS from './FreeSemiring'
import { flow, identity, pipe } from './function'
import { MultiURI } from './Modules'
import * as O from './Option'
import { tuple } from './tuple'
import { makeStack } from './util/support/Stack'

/*
 * -------------------------------------------
 * model
 * -------------------------------------------
 */

export type V = HKT.V<'W', '+'> & HKT.V<'S', '_'> & HKT.V<'R', '-'> & HKT.V<'E', '+'>

export const _MI = '_MI'
export type _MI = typeof _MI

export type Cause<E> = FreeSemiring<never, E>

abstract class MultiSyntax<W, S1, S2, R, E, A> {
  ['>>=']<W1, S3, Q, D, B>(
    this: Multi<W, S1, S2, R, E, A>,
    f: (a: A) => Multi<W1, S2, S3, Q, D, B>
  ): Multi<W | W1, S1, S3, Q & R, D | E, B> {
    return new Bind(this, f)
  }
  ['<$>']<B>(this: Multi<W, S1, S2, R, E, A>, f: (a: A) => B): Multi<W, S1, S2, R, E, B> {
    return this['>>=']((a) => new Succeed(f(a)))
  }
  ['$>']<B>(this: Multi<W, S1, S2, R, E, A>, b: () => B): Multi<W, S1, S2, R, E, B> {
    return this['<$>'](b)
  }
  ['*>']<W1, S3, Q, D, B>(
    this: Multi<W, S1, S2, R, E, A>,
    mb: Multi<W1, S2, S3, Q, D, B>
  ): Multi<W | W1, S1, S3, Q & R, D | E, B> {
    return zipr_(this, mb)
  }
  ['<*']<W1, S3, Q, D, B>(
    this: Multi<W, S1, S2, R, E, A>,
    mb: Multi<W1, S2, S3, Q, D, B>
  ): Multi<W | W1, S1, S3, Q & R, D | E, A> {
    return zipl_(this, mb)
  }
  ['<*>']<W1, S3, Q, D, B>(
    this: Multi<W, S1, S2, R, E, A>,
    mb: Multi<W1, S2, S3, Q, D, B>
  ): Multi<W | W1, S1, S3, Q & R, D | E, readonly [A, B]> {
    return zip_(this, mb)
  }
}

/**
 * `Multi<W, S1, S2, R, E, A>` is a purely functional description of a synchronous computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `Multi` can be used to model a variety of effects
 * including context, state, failure, and logging.
 *
 * @since 1.0.0
 */
export abstract class Multi<W, S1, S2, R, E, A> extends MultiSyntax<W, S1, S2, R, E, A> {
  readonly _U = MultiURI

  readonly _W!: () => W
  readonly _S1!: (_: S1) => void
  readonly _S2!: () => S2
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor() {
    super()
  }

  get [_MI](): MultiInstruction {
    return this as any
  }
}

export const MultiTag = {
  Succeed: 'Succeed',
  EffectTotal: 'EffectTotal',
  EffectPartial: 'EffectPartial',
  DeferTotal: 'DeferTotal',
  DeferPartial: 'DeferPartial',
  Fail: 'Fail',
  Modify: 'Modify',
  Bind: 'Bind',
  Fold: 'Fold',
  Asks: 'Asks',
  Give: 'Give',
  Tell: 'Tell',
  Censor: 'Censor',
  Listen: 'Listen'
} as const

class Succeed<A> extends Multi<never, unknown, never, unknown, never, A> {
  readonly _multiTag = MultiTag.Succeed
  constructor(readonly value: A) {
    super()
  }
}

class EffectTotal<A> extends Multi<never, unknown, never, unknown, never, A> {
  readonly _multiTag = MultiTag.EffectTotal
  constructor(readonly effect: () => A) {
    super()
  }
}

class EffectPartial<S, E, A> extends Multi<never, S, S, unknown, E, A> {
  readonly _multiTag = MultiTag.EffectPartial
  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

class DeferTotal<W, S1, S2, R, E, A> extends Multi<W, S1, S2, R, E, A> {
  readonly _multiTag = MultiTag.DeferTotal
  constructor(readonly ma: () => Multi<W, S1, S2, R, E, A>) {
    super()
  }
}

class DeferPartial<W, S1, S2, R, E, A, E1> extends Multi<W, S1, S2, R, E | E1, A> {
  readonly _multiTag = MultiTag.DeferPartial
  constructor(readonly ma: () => Multi<W, S1, S2, R, E, A>, readonly onThrow: (u: unknown) => E1) {
    super()
  }
}

class Fail<E> extends Multi<never, unknown, never, unknown, E, never> {
  readonly _multiTag = MultiTag.Fail
  constructor(readonly error: Cause<E>) {
    super()
  }
}

class Modify<S1, S2, A> extends Multi<never, S1, S2, unknown, never, A> {
  readonly _multiTag = MultiTag.Modify
  constructor(readonly run: (s1: S1) => readonly [S2, A]) {
    super()
  }
}

class Bind<W, S1, S2, R, E, A, W1, S3, Q, D, B> extends Multi<W | W1, S1, S3, Q & R, D | E, B> {
  readonly _multiTag = MultiTag.Bind
  constructor(readonly ma: Multi<W, S1, S2, R, E, A>, readonly f: (a: A) => Multi<W1, S2, S3, Q, D, B>) {
    super()
  }
}
class Match<W, S1, S2, S5, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C> extends Multi<
  W | W1 | W2,
  S1 & S5,
  S3 | S4,
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _multiTag = MultiTag.Fold
  constructor(
    readonly ma: Multi<W, S1, S2, R, E, A>,
    readonly onFailure: (e: Cause<E>) => Multi<W1, S5, S3, R1, E1, B>,
    readonly onSuccess: (a: A) => Multi<W2, S2, S4, R2, E2, C>
  ) {
    super()
    this.apply.bind(this)
  }
  apply(a: A): Multi<W2, S2, S4, R2, E2, C> {
    return this.onSuccess(a)
  }
}
class Asks<W, R0, S1, S2, R, E, A> extends Multi<W, S1, S2, R0 & R, E, A> {
  readonly _multiTag = MultiTag.Asks
  constructor(readonly f: (r: R0) => Multi<W, S1, S2, R, E, A>) {
    super()
  }
}

class Give<W, S1, S2, R, E, A> extends Multi<W, S1, S2, unknown, E, A> {
  readonly _multiTag = MultiTag.Give
  constructor(readonly ma: Multi<W, S1, S2, R, E, A>, readonly r: R) {
    super()
  }
}

class Tell<W> extends Multi<W, unknown, never, unknown, never, void> {
  readonly _multiTag = MultiTag.Tell
  constructor(readonly w: Array<W>) {
    super()
  }
}

class Censor<W, S1, S2, R, E, A, W1> extends Multi<W1, S1, S2, R, E, A> {
  readonly _multiTag = MultiTag.Censor
  constructor(readonly ma: Multi<W, S1, S2, R, E, A>, readonly f: (w: ReadonlyArray<W>) => ReadonlyArray<W1>) {
    super()
  }
}

class Listen<W, S1, S2, R, E, A> extends Multi<W, S1, S2, R, E, readonly [A, ReadonlyArray<W>]> {
  readonly _multiTag = MultiTag.Listen
  constructor(readonly ma: Multi<W, S1, S2, R, E, A>) {
    super()
  }
}

export type MultiInstruction =
  | Succeed<any>
  | Fail<any>
  | Modify<any, any, any>
  | Bind<any, any, any, any, any, any, any, any, any, any, any>
  | Match<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
  | Asks<any, any, any, any, any, any, any>
  | Give<any, any, any, any, any, any>
  | DeferTotal<any, any, any, any, any, any>
  | EffectTotal<any>
  | EffectPartial<any, any, any>
  | DeferPartial<any, any, any, any, any, any, any>
  | Tell<any>
  | Censor<any, any, any, any, any, any, any>
  | Listen<any, any, any, any, any, any>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function succeed<A>(a: A): Multi<never, unknown, never, unknown, never, A> {
  return new Succeed(a)
}

export function effectTotal<A>(effect: () => A): Multi<never, unknown, never, unknown, never, A> {
  return new EffectTotal(effect)
}

export function halt<E>(cause: Cause<E>): Multi<never, unknown, never, unknown, E, never> {
  return new Fail(cause)
}

export function fail<E>(e: E): Multi<never, unknown, never, unknown, E, never> {
  return halt(FS.single(e))
}

export function deferTotal<W, S1, S2, R, E, A>(ma: () => Multi<W, S1, S2, R, E, A>): Multi<W, S1, S2, R, E, A> {
  return new DeferTotal(ma)
}

export function defer<W, S1, S2, R, E, A>(ma: () => Multi<W, S1, S2, R, E, A>): Multi<W, S1, S2, R, unknown, A> {
  return new DeferPartial(ma, identity)
}

export function deferCatch_<W, S1, S2, R, E, A, E1>(
  ma: () => Multi<W, S1, S2, R, E, A>,
  f: (e: unknown) => E1
): Multi<W, S1, S2, R, E | E1, A> {
  return new DeferPartial(ma, f)
}

export function deferCatch<E1>(
  onThrow: (e: unknown) => E1
): <W, S1, S2, R, E, A>(ma: () => Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, E | E1, A> {
  return (ma) => deferCatch_(ma, onThrow)
}

export function effect<S, A>(effect: () => A): Multi<never, S, S, unknown, unknown, A> {
  return new EffectPartial(effect, identity)
}

export function effectCatch_<S, E, A>(
  effect: () => A,
  onThrow: (reason: unknown) => E
): Multi<never, S, S, unknown, E, A> {
  return new EffectPartial(effect, onThrow)
}

export function effectCatch<S, E>(
  onThrow: (reason: unknown) => E
): <A>(effect: () => A) => Multi<never, S, S, unknown, E, A> {
  return (effect) => effectCatch_(effect, onThrow)
}

/*
 * -------------------------------------------
 * State
 * -------------------------------------------
 */

/**
 * Constructs a computation from the specified modify function.
 */
export function modify<S1, S2, A>(f: (s: S1) => readonly [S2, A]): Multi<never, S1, S2, unknown, never, A> {
  return new Modify(f)
}

/**
 * Constructs a computation that may fail from the specified modify function.
 */
export function modifyEither<S1, S2, E, A>(
  f: (s: S1) => E.Either<E, readonly [S2, A]>
): Multi<never, S1, S2, unknown, E, A> {
  return pipe(get<S1>(), map(f), bind(E.match(fail, ([s2, a]) => pipe(succeed(a), asState(s2)))))
}

/**
 * Constructs a computation that returns the initial state unchanged.
 */
export function get<S>(): Multi<never, S, S, unknown, never, S> {
  return modify((s) => [s, s])
}

/**
 * Constructs a computation that sets the state to the specified value.
 */
export function put<S>(s: S): Multi<never, unknown, S, unknown, never, void> {
  return modify(() => [s, undefined])
}

export function gets<S, A>(f: (s: S) => A): Multi<never, S, S, unknown, never, A> {
  return modify((s) => [s, f(s)])
}

export function mapState_<W, S1, S2, R, E, A, S3>(
  ma: Multi<W, S1, S2, R, E, A>,
  f: (s: S2) => S3
): Multi<W, S1, S3, R, E, A> {
  return ma['<*'](update(f))
}

export function mapState<S2, S3>(
  f: (s: S2) => S3
): <W, S1, R, E, A>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S3, R, E, A> {
  return (ma) => mapState_(ma, f)
}

export function asState_<W, S1, S2, R, E, A, S3>(ma: Multi<W, S1, S2, R, E, A>, s: S3): Multi<W, S1, S3, R, E, A> {
  return mapState_(ma, () => s)
}

export function asState<S3>(s: S3): <W, S1, S2, R, E, A>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S3, R, E, A> {
  return (ma) => asState_(ma, s)
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapState_<S0, W, S1, S2, R, E, A>(
  fa: Multi<W, S1, S2, R, E, A>,
  f: (s: S0) => S1
): Multi<W, S0, S2, R, E, A> {
  return bind_(update(f), () => fa)
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapState<S0, S1>(
  f: (s: S0) => S1
): <W, S2, R, E, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S0, S2, R, E, A> {
  return (fa) => contramapState_(fa, f)
}

/*
 * -------------------------------------------
 * match
 * -------------------------------------------
 */

export function matchCauseM_<W, S1, S2, R, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Multi<W, S1, S2, R, E, A>,
  onFailure: (e: Cause<E>) => Multi<W1, S0, S3, R1, E1, B>,
  onSuccess: (a: A) => Multi<W2, S2, S4, R2, E2, C>
): Multi<W | W1 | W2, S1 & S0, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return new Match(fa, onFailure, onSuccess)
}

export function matchCauseM<S1, S2, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (e: Cause<E>) => Multi<W1, S0, S3, R1, E1, B>,
  onSuccess: (a: A) => Multi<W2, S2, S4, R2, E2, C>
): <W, R>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W | W1 | W2, S1 & S0, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchCauseM_(fa, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchM_<W, S1, S5, S2, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Multi<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Multi<W1, S5, S3, R1, E1, B>,
  onSuccess: (a: A) => Multi<W2, S2, S4, R2, E2, C>
): Multi<W | W1 | W2, S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return matchCauseM_(fa, flow(FS.first, onFailure), onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchM<S1, S2, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (e: E) => Multi<W1, S0, S3, R1, E1, B>,
  onSuccess: (a: A) => Multi<W2, S2, S4, R2, E2, C>
): <W, R>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W | W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchM_(fa, onFailure, onSuccess)
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function match_<W, S1, S2, R, E, A, B, C>(
  fa: Multi<W, S1, S2, R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): Multi<W, S1, S2, R, never, B | C> {
  return matchM_(
    fa,
    (e) => succeed(onFailure(e)),
    (a) => succeed(onSuccess(a))
  )
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function match<E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): <W, S1, S2, R>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, never, B | C> {
  return (fa) => match_(fa, onFailure, onSuccess)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export function alt_<W, S1, S2, R, E, A, W1, S3, R1, E1, A1>(
  fa: Multi<W, S1, S2, R, E, A>,
  fb: () => Multi<W1, S1, S3, R1, E1, A1>
): Multi<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1> {
  return matchM_(fa, () => fb(), succeed)
}

export function alt<W1, S1, S3, R1, E1, A1>(
  fb: () => Multi<W1, S1, S3, R1, E1, A1>
): <W, S2, R, E, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1> {
  return (fa) => alt_(fa, fb)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<S = unknown, A = never>(a: A): Multi<never, S, S, unknown, never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function cross_<W, S, R, E, A, Q, D, B>(
  fa: Multi<W, S, S, R, E, A>,
  fb: Multi<W, S, S, Q, D, B>
): Multi<W, S, S, Q & R, D | E, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<W, S, Q, D, B>(
  fb: Multi<W, S, S, Q, D, B>
): <R, E, A>(fa: Multi<W, S, S, R, E, A>) => Multi<W, S, S, Q & R, D | E, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossPar_<W, S, R, E, A, R1, E1, B>(
  fa: Multi<W, S, S, R, E, A>,
  fb: Multi<W, S, S, R1, E1, B>
): Multi<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, tuple)
}

export function crossPar<W, S, R1, E1, B>(
  fb: Multi<W, S, S, R1, E1, B>
): <R, E, A>(fa: Multi<W, S, S, R, E, A>) => Multi<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function crossWith_<W, S, R, E, A, Q, D, B, C>(
  fa: Multi<W, S, S, R, E, A>,
  fb: Multi<W, S, S, Q, D, B>,
  f: (a: A, b: B) => C
): Multi<W, S, S, Q & R, D | E, C> {
  return zipWith_(fa, fb, f)
}

export function crossWith<W, S, A, R1, E1, B, C>(
  fb: Multi<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Multi<W, S, S, R, E, A>) => Multi<W, S, S, R1 & R, E1 | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function crossWithPar_<W, S, R, E, A, R1, E1, B, C>(
  ma: Multi<W, S, S, R, E, A>,
  mb: Multi<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): Multi<W, S, S, R & R1, E | E1, C> {
  return pipe(
    ma,
    matchCauseM(
      (c1) =>
        pipe(
          mb,
          matchCauseM(
            (c2) => halt(FS.both(c1, c2)),
            (_) => halt(c1)
          )
        ),
      (a) => map_(mb, (b) => f(a, b))
    )
  )
}

export function crossWithPar<W, S, A, R1, E1, B, C>(
  mb: Multi<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(ma: Multi<W, S, S, R, E, A>) => Multi<W, S, S, R & R1, E | E1, C> {
  return (ma) => crossWithPar_(ma, mb, f)
}

export function ap_<W, S, R, E, A, R1, E1, B>(
  fab: Multi<W, S, S, R, E, (a: A) => B>,
  fa: Multi<W, S, S, R1, E1, A>
): Multi<W, S, S, R1 & R, E1 | E, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<W, S, R1, E1, A>(
  fa: Multi<W, S, S, R1, E1, A>
): <R, E, B>(fab: Multi<W, S, S, R, E, (a: A) => B>) => Multi<W, S, S, R1 & R, E1 | E, B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<W, S, R, E, A, R1, E1, B>(
  fa: Multi<W, S, S, R, E, A>,
  fb: Multi<W, S, S, R1, E1, B>
): Multi<W, S, S, R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function apl<W, S, R1, E1, B>(
  fb: Multi<W, S, S, R1, E1, B>
): <R, E, A>(fa: Multi<W, S, S, R, E, A>) => Multi<W, S, S, R & R1, E | E1, A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<W, S, R, E, A, R1, E1, B>(
  fa: Multi<W, S, S, R, E, A>,
  fb: Multi<W, S, S, R1, E1, B>
): Multi<W, S, S, R & R1, E | E1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function apr<W, S, R1, E1, B>(
  fb: Multi<W, S, S, R1, E1, B>
): <R, E, A>(fa: Multi<W, S, S, R, E, A>) => Multi<W, S, S, R & R1, E | E1, B> {
  return (fa) => apr_(fa, fb)
}

/*
 * -------------------------------------------
 * Zip
 * -------------------------------------------
 */

export function zip_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  fa: Multi<W, S1, S2, R, E, A>,
  fb: Multi<W1, S2, S3, R1, E1, B>
): Multi<W | W1, S1, S3, R & R1, E | E1, readonly [A, B]> {
  return zipWith_(fa, fb, tuple)
}

export function zip<W1, S2, S3, R1, E1, B>(
  fb: Multi<W1, S2, S3, R1, E1, B>
): <W, S1, R, E, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S3, R & R1, E | E1, readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function zipWith_<W, S1, S2, R, E, A, W1, S3, R1, E1, B, C>(
  fa: Multi<W, S1, S2, R, E, A>,
  fb: Multi<W1, S2, S3, R1, E1, B>,
  f: (a: A, b: B) => C
): Multi<W | W1, S1, S3, R & R1, E | E1, C> {
  return bind_(fa, (a) => bind_(fb, (b) => succeed(f(a, b))))
}

export function zipWith<A, W1, S2, S3, R1, E1, B, C>(
  fb: Multi<W1, S2, S3, R1, E1, B>,
  f: (a: A, b: B) => C
): <W, S1, R, E>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S3, R & R1, E | E1, C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zipl_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Multi<W, S1, S2, R, E, A>,
  fb: Multi<W1, S2, S3, Q, D, B>
): Multi<W | W1, S1, S3, Q & R, D | E, A> {
  return zipWith_(fa, fb, (a, _) => a)
}

export function zipl<W1, S2, S3, Q, D, B>(
  fb: Multi<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S3, Q & R, D | E, A> {
  return (fa) => zipl_(fa, fb)
}

export function zipr_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Multi<W, S1, S2, R, E, A>,
  fb: Multi<W1, S2, S3, Q, D, B>
): Multi<W | W1, S1, S3, Q & R, D | E, B> {
  return zipWith_(fa, fb, (_, b) => b)
}

export function zipr<W1, S2, S3, Q, D, B>(
  fb: Multi<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S3, Q & R, D | E, B> {
  return (fa) => zipr_(fa, fb)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<W, S1, S2, R, E, A, G, B>(
  pab: Multi<W, S1, S2, R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): Multi<W, S1, S2, R, G, B> {
  return matchM_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  )
}

export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <W, S1, S2, R>(pab: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, G, B> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * Returns a computation with its full cause of failure mapped using the
 * specified function. This can be users to transform errors while
 * preserving the original structure of the `Cause`.
 */
export function mapErrorCause_<W, S1, S2, R, E, A, E1>(
  ma: Multi<W, S1, S2, R, E, A>,
  f: (_: Cause<E>) => Cause<E1>
): Multi<W, S1, S2, R, E1, A> {
  return matchCauseM_(ma, flow(f, halt), succeed)
}

/**
 * Returns a computation with its full cause of failure mapped using the
 * specified function. This can be users to transform errors while
 * preserving the original structure of the `Cause`.
 */
export function mapErrorCause<E, E1>(
  f: (_: Cause<E>) => Cause<E1>
): <W, S1, S2, R, A>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, E1, A> {
  return (ma) => mapErrorCause_(ma, f)
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 */
export function mapError_<W, S1, S2, R, E, A, G>(
  pab: Multi<W, S1, S2, R, E, A>,
  f: (e: E) => G
): Multi<W, S1, S2, R, G, A> {
  return matchM_(pab, (e) => fail(f(e)), succeed)
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 */
export function mapError<E, G>(
  f: (e: E) => G
): <W, S1, S2, R, A>(pab: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, G, A> {
  return (pab) => mapError_(pab, f)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export function attempt<W, S1, S2, R, E, A>(fa: Multi<W, S1, S2, R, E, A>): Multi<W, S1, S2, R, never, E.Either<E, A>> {
  return matchM_(fa, flow(E.Left, succeed), flow(E.Right, succeed))
}

export function refail<W, S1, S2, R, E, E1, A>(
  fa: Multi<W, S1, S2, R, E, E.Either<E1, A>>
): Multi<W, S1, S2, R, E | E1, A> {
  return bind_(fa, E.match(fail, succeed))
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<W, S1, S2, R, E, A, B>(fa: Multi<W, S1, S2, R, E, A>, f: (a: A) => B): Multi<W, S1, S2, R, E, B> {
  return bind_(fa, flow(f, succeed))
}

export function map<A, B>(
  f: (a: A) => B
): <W, S1, S2, R, E>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  ma: Multi<W, S1, S2, R, E, A>,
  f: (a: A) => Multi<W1, S2, S3, R1, E1, B>
): Multi<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return new Bind(ma, f)
}

export function bind<A, W1, S2, S3, R1, E1, B>(
  f: (a: A) => Multi<W1, S2, S3, R1, E1, B>
): <W, S1, R, E>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return (ma) => bind_(ma, f)
}

export function tap_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  ma: Multi<W, S1, S2, R, E, A>,
  f: (a: A) => Multi<W1, S2, S3, R1, E1, B>
): Multi<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return bind_(ma, (a) => map_(f(a), () => a))
}

export function tap<S2, A, W1, S3, R1, E1, B>(
  f: (a: A) => Multi<W1, S2, S3, R1, E1, B>
): <W, S1, R, E>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return (ma) => tap_(ma, f)
}

export function flatten<W, S1, S2, R, E, A, W1, S3, R1, E1>(
  mma: Multi<W, S1, S2, R, E, Multi<W1, S2, S3, R1, E1, A>>
): Multi<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): Multi<never, unknown, never, R, never, R> {
  return new Asks((r: R) => succeed(r))
}

export function asksM<R0, W, S1, S2, R, E, A>(f: (r: R0) => Multi<W, S1, S2, R, E, A>): Multi<W, S1, S2, R & R0, E, A> {
  return new Asks(f)
}

export function asks<S, R, A>(f: (r: R) => A): Multi<never, S, S, R, never, A> {
  return asksM((r: R) => succeed(f(r)))
}

export function giveAll_<W, S1, S2, R, E, A>(fa: Multi<W, S1, S2, R, E, A>, r: R): Multi<W, S1, S2, unknown, E, A> {
  return new Give(fa, r)
}

export function giveAll<R>(r: R): <W, S1, S2, E, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, unknown, E, A> {
  return (fa) => giveAll_(fa, r)
}

export function gives_<R0, W, S1, S2, R, E, A>(
  ma: Multi<W, S1, S2, R, E, A>,
  f: (r0: R0) => R
): Multi<W, S1, S2, R0, E, A> {
  return asksM((r: R0) => giveAll_(ma, f(r)))
}

export function gives<R0, R>(
  f: (r0: R0) => R
): <W, S1, S2, E, A>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R0, E, A> {
  return (ma) => gives_(ma, f)
}

export function give_<W, S1, S2, R, E, A, R0>(ma: Multi<W, S1, S2, R & R0, E, A>, r: R): Multi<W, S1, S2, R0, E, A> {
  return gives_(ma, (r0) => ({ ...r, ...r0 }))
}

export function give<R>(r: R): <W, S1, S2, R0, E, A>(ma: Multi<W, S1, S2, R & R0, E, A>) => Multi<W, S1, S2, R0, E, A> {
  return (ma) => give_(ma, r)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Multi<never, unknown, never, unknown, never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------
 * Writer
 * -------------------------------------------
 */

export function tell<W>(w: W): Multi<W, unknown, never, unknown, never, void> {
  return new Tell([w])
}

export function tellAll<W>(w: ReadonlyArray<W>): Multi<W, unknown, never, unknown, never, void> {
  return new Tell(w as Array<W>)
}

export function censor_<W, S1, S2, R, E, A, W1>(
  wa: Multi<W, S1, S2, R, E, A>,
  f: (w: ReadonlyArray<W>) => ReadonlyArray<W1>
): Multi<W1, S1, S2, R, E, A> {
  return new Censor(wa, f)
}

export function censor<W, W1>(
  f: (w: ReadonlyArray<W>) => ReadonlyArray<W1>
): <S1, S2, R, E, A>(wa: Multi<W, S1, S2, R, E, A>) => Multi<W1, S1, S2, R, E, A> {
  return (wa) => censor_(wa, f)
}

export function write_<W, S1, S2, R, E, A, W1>(ma: Multi<W, S1, S2, R, E, A>, w: W1): Multi<W | W1, S1, S2, R, E, A> {
  return censor_(ma, (ws) => [...ws, w])
}

export function write<W1>(
  w: W1
): <W, S1, S2, R, E, A>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S2, R, E, A> {
  return (ma) => write_(ma, w)
}

export function writeAll_<W, S1, S2, R, E, A, W1>(
  ma: Multi<W, S1, S2, R, E, A>,
  ws: ReadonlyArray<W1>
): Multi<W | W1, S1, S2, R, E, A> {
  return censor_(ma, (ws0) => [...ws0, ...ws])
}

export function writeAll<W1>(
  ws: ReadonlyArray<W1>
): <W, S1, S2, R, E, A>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W | W1, S1, S2, R, E, A> {
  return (ma) => writeAll_(ma, ws)
}

export function listen<W, S1, S2, R, E, A>(
  wa: Multi<W, S1, S2, R, E, A>
): Multi<W, S1, S2, R, E, readonly [A, ReadonlyArray<W>]> {
  return new Listen(wa)
}

export function listens_<W, S1, S2, R, E, A, B>(
  wa: Multi<W, S1, S2, R, E, A>,
  f: (l: ReadonlyArray<W>) => B
): Multi<W, S1, S2, R, E, readonly [A, B]> {
  return pipe(
    wa,
    listen,
    map(([a, ws]) => [a, f(ws)])
  )
}

export function listens<W, B>(
  f: (l: ReadonlyArray<W>) => B
): <S1, S2, R, E, A>(wa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, E, readonly [A, B]> {
  return (wa) => listens_(wa, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<W, S1, S2, R, E, A, S3, R1, E1, B>(
  fa: Multi<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Multi<W, S1, S3, R1, E1, B>
): Multi<W, S1, S3, R & R1, E1, A | B> {
  return matchM_(fa, onFailure, (a) => succeed(a))
}

/**
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll<W, S1, E, S3, R1, E1, B>(
  onFailure: (e: E) => Multi<W, S1, S3, R1, E1, B>
): <S2, R, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S3, R & R1, E1, B | A> {
  return (fa) => catchAll_(fa, onFailure)
}

export function catchSome_<W, S1, S2, R, E, A, S3, R1, E1, B>(
  fa: Multi<W, S1, S2, R, E, A>,
  f: (e: E) => O.Option<Multi<W, S1, S3, R1, E1, B>>
): Multi<W, S1, S2 | S3, R & R1, E | E1, A | B> {
  return catchAll_(
    fa,
    flow(
      f,
      O.getOrElse((): Multi<W, S1, S2 | S3, R & R1, E | E1, A | B> => fa)
    )
  )
}

export function catchSome<W, S1, E, S3, R1, E1, B>(
  f: (e: E) => O.Option<Multi<W, S1, S3, R1, E1, B>>
): <S2, R, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2 | S3, R & R1, E | E1, B | A> {
  return (fa) => catchSome_(fa, f)
}

/**
 * Constructs a computation from the specified update function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function update<S1, S2>(f: (s: S1) => S2): Multi<never, S1, S2, unknown, never, void> {
  return modify((s) => [f(s), undefined])
}

/**
 * Repeats this computation the specified number of times (or until the first failure)
 * passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatN_<W, S1, S2 extends S1, R, E, A>(
  ma: Multi<W, S1, S2, R, E, A>,
  n: number
): Multi<W, S1, S2, R, E, A> {
  return bind_(ma, (a) => (n <= 0 ? succeed(a) : repeatN_(ma, n - 1)))
}

/**
 * Repeats this computation the specified number of times (or until the first failure)
 * passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatN(
  n: number
): <W, S1, S2 extends S1, R, E, A>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, E, A> {
  return (ma) => repeatN_(ma, n)
}

/**
 * Repeats this computation until its value satisfies the specified predicate
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatUntil_<W, S1, S2 extends S1, R, E, A>(
  ma: Multi<W, S1, S2, R, E, A>,
  predicate: Predicate<A>
): Multi<W, S1, S2, R, E, A> {
  return bind_(ma, (a) => (predicate(a) ? succeed(a) : repeatUntil_(ma, predicate)))
}

/**
 * Repeats this computation until its value satisfies the specified predicate
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatUntil<A>(
  predicate: Predicate<A>
): <W, S1, S2 extends S1, R, E>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, E, A> {
  return (ma) => repeatUntil_(ma, predicate)
}

/**
 * Repeats this computation until its value is equal to the specified value
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatUntilEquals_<A>(
  E: Eq<A>
): <W, S1, S2 extends S1, R, E>(ma: Multi<W, S1, S2, R, E, A>, value: () => A) => Multi<W, S1, S2, R, E, A> {
  return (ma, value) => repeatUntil_(ma, (a) => E.equals_(a, value()))
}

/**
 * Repeats this computation until its value is equal to the specified value
 * (or until the first failure) passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatUntilEquals<A>(
  E: Eq<A>
): (value: () => A) => <W, S1, S2 extends S1, R, E>(ma: Multi<W, S1, S2, R, E, A>) => Multi<W, S1, S2, R, E, A> {
  const repeatUntilEqualsE_ = repeatUntilEquals_(E)
  return (value) => (ma) => repeatUntilEqualsE_(ma, value)
}

/**
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function either<W, S1, S2, R, E, A>(
  fa: Multi<W, S1, S2, R, E, A>
): Multi<W, S1, S1 | S2, R, never, E.Either<E, A>> {
  return match_(fa, E.Left, E.Right)
}

/**
 * Exposes the output state into the value channel
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getState<W, S1, S2, R, E, A>(ma: Multi<W, S1, S2, R, E, A>): Multi<W, S1, S2, R, E, readonly [S2, A]> {
  return bind_(ma, (a) => map_(get(), (s) => tuple(s, a)))
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category combinators
 * @since 1.0.0
 */
export function orElse_<W, S1, S2, R, E, A, S3, S4, R1, E1>(
  fa: Multi<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Multi<W, S3, S4, R1, E1, A>
): Multi<W, S1 & S3, S2 | S4, R & R1, E1, A> {
  return matchM_(fa, onFailure, succeed)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category combinators
 * @since 1.0.0
 */
export function orElse<W, E, A, S3, S4, R1, E1>(
  onFailure: (e: E) => Multi<W, S3, S4, R1, E1, A>
): <S1, S2, R>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1 & S3, S4 | S2, R & R1, E1, A> {
  return (fa) => orElse_(fa, onFailure)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElseEither_<W, S1, S2, R, E, A, S3, S4, R1, E1, A1>(
  fa: Multi<W, S1, S2, R, E, A>,
  that: Multi<W, S3, S4, R1, E1, A1>
): Multi<W, S1 & S3, S2 | S4, R & R1, E1, E.Either<A, A1>> {
  return matchM_(
    fa,
    () => map_(that, E.Right),
    (a) => succeed(E.Left(a))
  )
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElseEither<W, S3, S4, R1, E1, A1>(
  that: Multi<W, S3, S4, R1, E1, A1>
): <S1, S2, R, E, A>(fa: Multi<W, S1, S2, R, E, A>) => Multi<W, S1 & S3, S4 | S2, R & R1, E1, E.Either<A, A1>> {
  return (fa) => orElseEither_(fa, that)
}

/*
 * -------------------------------------------
 * Runtime
 * -------------------------------------------
 */

/*
 * class FoldFrame {
 *   readonly _multiTag = 'FoldFrame'
 *   constructor(
 *     readonly failure: (e: any) => Multi<any, any, any, any, any, any>,
 *     readonly apply: (e: any) => Multi<any, any, any, any, any, any>
 *   ) {}
 * }
 */

class ApplyFrame {
  readonly _multiTag = 'ApplyFrame'
  constructor(readonly apply: (e: any) => Multi<any, any, any, any, any, any>) {}
}

type Frame = Match<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any> | ApplyFrame

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runAll_<W, S1, S2, E, A>(
  ma: Multi<W, S1, S2, unknown, E, A>,
  s: S1
): readonly [ReadonlyArray<W>, E.Either<Cause<E>, readonly [S2, A]>] {
  let frames: Stack<Frame> | undefined    = undefined
  let environment: Stack<any> | undefined = makeStack({})

  let s0          = s as any
  let result: any = null
  let failed      = false
  let current     = ma as Multi<any, any, any, any, any, any> | undefined
  let log         = Array<W>()

  function popContinuation() {
    const current = frames?.value
    frames        = frames?.previous
    return current
  }

  function pushContinuation(cont: Frame) {
    frames = makeStack(cont, frames)
  }

  function findNextErrorHandler() {
    let unwinding = true
    while (unwinding) {
      const next = popContinuation()

      if (next == null) {
        unwinding = false
      } else {
        if (next._multiTag === MultiTag.Fold) {
          unwinding = false
          pushContinuation(new ApplyFrame(next.onFailure))
        }
      }
    }
  }

  function pushEnv(k: any) {
    environment = makeStack(k, environment)
  }

  function popEnv() {
    const current = environment?.value || {}
    environment   = environment?.previous
    return current
  }

  while (current != null) {
    const I = current[_MI]

    switch (I._multiTag) {
      case MultiTag.Bind: {
        const nested       = I.ma[_MI]
        const continuation = I.f

        switch (nested._multiTag) {
          case MultiTag.Succeed: {
            current = continuation(nested.value)
            break
          }
          case MultiTag.EffectTotal: {
            current = continuation(nested.effect())
            break
          }
          case MultiTag.EffectPartial: {
            try {
              current = succeed(nested.effect())
            } catch (e) {
              current = fail(nested.onThrow(e))
            }
            break
          }
          case MultiTag.Modify: {
            const updated = nested.run(s0)

            s0     = updated[0]
            result = updated[1]

            current = continuation(result)
            break
          }
          default: {
            current = nested
            pushContinuation(new ApplyFrame(continuation))
          }
        }

        break
      }
      case MultiTag.EffectTotal: {
        result                = I.effect()
        const nextInstruction = popContinuation()
        if (nextInstruction) {
          current = nextInstruction.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case MultiTag.EffectPartial: {
        try {
          current = succeed(I.effect())
        } catch (e) {
          current = fail(I.onThrow(e))
        }
        break
      }
      case MultiTag.DeferTotal: {
        current = I.ma()
        break
      }
      case MultiTag.DeferPartial: {
        try {
          current = I.ma()
        } catch (e) {
          current = fail(I.onThrow(e))
        }
        break
      }
      case MultiTag.Succeed: {
        result          = I.value
        const nextInstr = popContinuation()
        if (nextInstr) {
          current = nextInstr.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case MultiTag.Fail: {
        findNextErrorHandler()
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(I.error)
        } else {
          failed  = true
          result  = I.error
          current = undefined
        }
        break
      }
      case MultiTag.Fold: {
        const state = s0
        const match = new Match(I.ma, (cause) => put(state)['*>'](I.onFailure(cause)), I.onSuccess)
        pushContinuation(match)
        current = I.ma
        break
      }
      case MultiTag.Asks: {
        current = I.f(environment.value || {})
        break
      }
      case MultiTag.Give: {
        pushEnv(I.r)
        current = matchM_(
          I.ma,
          (e) =>
            effectTotal(() => {
              popEnv()
            })['*>'](fail(e)),
          (a) =>
            effectTotal(() => {
              popEnv()
            })['*>'](succeed(a))
        )
        break
      }
      case MultiTag.Modify: {
        const updated  = I.run(s0)
        s0             = updated[0]
        result         = updated[1]
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case MultiTag.Tell: {
        log            = I.w
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case MultiTag.Censor: {
        current = I.ma
        pushContinuation(
          new ApplyFrame((_) =>
            effectTotal(() => {
              log = I.f(log) as Array<W>
              return result
            })
          )
        )
        break
      }
      case MultiTag.Listen: {
        current = I.ma
        pushContinuation(
          new ApplyFrame((_) =>
            effectTotal(() => {
              result = [_, log]
              return result
            })
          )
        )
        break
      }
    }
  }

  if (failed) {
    return [log, E.Left(result)]
  }

  return [log, E.Right([s0, result])]
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runAll<S1>(
  s: S1
): <W, S2, E, A>(
  fa: Multi<W, S1, S2, unknown, E, A>
) => readonly [ReadonlyArray<W>, E.Either<Cause<E>, readonly [S2, A]>] {
  return (fa) => runAll_(fa, s)
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export function run_<W, S2, A>(ma: Multi<W, unknown, S2, unknown, never, A>): readonly [S2, A]
export function run_<W, S1, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>, s: S1): readonly [S2, A]
export function run_<W, S1, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>, s?: S1): readonly [S2, A] {
  const result = (runAll_(ma, s || ({} as any))[1] as E.Right<readonly [S2, A]>).right
  return [result[0], result[1]]
}

/**
 * Runs this computation with the specified initial state, returning both
 * updated state and the result
 */
export function run(_: void): <W, S2, A>(ma: Multi<W, unknown, S2, unknown, never, A>) => readonly [S2, A]
export function run<S1>(s: S1): <W, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>) => readonly [S2, A]
export function run<S1>(s: S1): <W, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>) => readonly [S2, A] {
  return (ma) => run_(ma, s)
}

export function runResult<W, S2, A>(ma: Multi<W, unknown, S2, unknown, never, A>): A {
  return run_(ma, {})[1]
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export function runState_<W, S1, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>, s: S1): S2 {
  return run_(ma, s)[0]
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export function runState<S1>(s: S1): <W, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>) => S2 {
  return (ma) => runState_(ma, s)
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runStateResult_<W, S1, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>, s: S1): A {
  return (runAll_(ma, s)[1] as E.Right<readonly [S2, A]>).right[1]
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runStateResult<S1>(s: S1): <W, S2, A>(ma: Multi<W, S1, S2, unknown, never, A>) => A {
  return (ma) => runStateResult_(ma, s)
}

/**
 * Runs this computation returning either the result or error
 */
export function runEither<S2, E, A>(ma: Multi<never, unknown, S2, unknown, E, A>): E.Either<E, A> {
  return pipe(
    runAll_(ma, {} as never)[1],
    E.map(([, x]) => x),
    E.mapLeft(FS.first)
  )
}

export { MultiURI } from './Modules'
