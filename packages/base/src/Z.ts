/**
 * Ported from https://github.com/zio/zio-prelude/blob/master/core/shared/src/main/scala/zio/prelude/fx/ZPure.scala
 */
import type { FreeSemiring } from './FreeSemiring'
import type { Stack } from './util/support/Stack'
import type { Eq } from '@principia/prelude/Eq'
import type * as HKT from '@principia/prelude/HKT'
import type { Predicate } from '@principia/prelude/Predicate'

import * as P from '@principia/prelude'

import * as A from './Array/core'
import * as E from './Either'
import * as FS from './FreeSemiring'
import * as I from './Iterable'
import { ZURI } from './Modules'
import * as O from './Option'
import { makeStack } from './util/support/Stack'

/*
 * -------------------------------------------
 * model
 * -------------------------------------------
 */

export const _ZI = '_ZI'
export type _ZI = typeof _ZI

export type Cause<E> = FreeSemiring<never, E>

abstract class ZSyntax<W, S1, S2, R, E, A> {
  ['>>=']<W1, S3, Q, D, B>(
    this: Z<W, S1, S2, R, E, A>,
    f: (a: A) => Z<W1, S2, S3, Q, D, B>
  ): Z<W | W1, S1, S3, Q & R, D | E, B> {
    return new Bind(this, f)
  }
  ['<$>']<B>(this: Z<W, S1, S2, R, E, A>, f: (a: A) => B): Z<W, S1, S2, R, E, B> {
    return this['>>=']((a) => new Succeed(f(a)))
  }
  ['$>']<B>(this: Z<W, S1, S2, R, E, A>, b: () => B): Z<W, S1, S2, R, E, B> {
    return this['<$>'](b)
  }
  ['*>']<W1, S3, Q, D, B>(this: Z<W, S1, S2, R, E, A>, mb: Z<W1, S2, S3, Q, D, B>): Z<W | W1, S1, S3, Q & R, D | E, B> {
    return zipr_(this, mb)
  }
  ['<*']<W1, S3, Q, D, B>(this: Z<W, S1, S2, R, E, A>, mb: Z<W1, S2, S3, Q, D, B>): Z<W | W1, S1, S3, Q & R, D | E, A> {
    return zipl_(this, mb)
  }
  ['<*>']<W1, S3, Q, D, B>(
    this: Z<W, S1, S2, R, E, A>,
    mb: Z<W1, S2, S3, Q, D, B>
  ): Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]> {
    return zip_(this, mb)
  }
}

/**
 * `Z<W, S1, S2, R, E, A>` is a purely functional description of a synchronous computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `Z` can be used to model a variety of effects
 * including context, state, failure, and logging.
 *
 * @note named `Z` in honor of `ZIO` and because it is, surely, the last computational monad
 * one will ever need :)
 *
 * @since 1.0.0
 */
export abstract class Z<W, S1, S2, R, E, A> extends ZSyntax<W, S1, S2, R, E, A> {
  readonly _U = ZURI

  readonly _W!: () => W
  readonly _S1!: (_: S1) => void
  readonly _S2!: () => S2
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor() {
    super()
  }

  get [_ZI](): Instruction {
    return this as any
  }
}

const Tags = {
  Succeed: 'Succeed',
  EffectTotal: 'EffectTotal',
  EffectPartial: 'EffectPartial',
  DeferTotal: 'DeferTotal',
  DeferPartial: 'DeferPartial',
  Fail: 'Fail',
  Modify: 'Modify',
  Bind: 'Bind',
  Match: 'Match',
  Asks: 'Asks',
  Give: 'Give',
  Tell: 'Tell',
  Listen: 'Listen',
  Censor: 'Censor'
} as const

class Succeed<A> extends Z<never, unknown, never, unknown, never, A> {
  readonly _multiTag = Tags.Succeed
  constructor(readonly value: A) {
    super()
  }
}

class EffectTotal<A> extends Z<never, unknown, never, unknown, never, A> {
  readonly _multiTag = Tags.EffectTotal
  constructor(readonly effect: () => A) {
    super()
  }
}

class EffectPartial<E, A> extends Z<never, unknown, never, unknown, E, A> {
  readonly _multiTag = Tags.EffectPartial
  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

class DeferTotal<W, S1, S2, R, E, A> extends Z<W, S1, S2, R, E, A> {
  readonly _multiTag = Tags.DeferTotal
  constructor(readonly z: () => Z<W, S1, S2, R, E, A>) {
    super()
  }
}

class DeferPartial<W, S1, S2, R, E, A, E1> extends Z<W, S1, S2, R, E | E1, A> {
  readonly _multiTag = Tags.DeferPartial
  constructor(readonly z: () => Z<W, S1, S2, R, E, A>, readonly onThrow: (u: unknown) => E1) {
    super()
  }
}

class Fail<E> extends Z<never, unknown, never, unknown, E, never> {
  readonly _multiTag = Tags.Fail
  constructor(readonly error: Cause<E>) {
    super()
  }
}

class Modify<S1, S2, A> extends Z<never, S1, S2, unknown, never, A> {
  readonly _multiTag = Tags.Modify
  constructor(readonly run: (s1: S1) => readonly [A, S2]) {
    super()
  }
}

class Bind<W, S1, S2, R, E, A, W1, S3, Q, D, B> extends Z<W | W1, S1, S3, Q & R, D | E, B> {
  readonly _multiTag = Tags.Bind
  constructor(readonly z: Z<W, S1, S2, R, E, A>, readonly cont: (a: A) => Z<W1, S2, S3, Q, D, B>) {
    super()
  }
}

class Match<W, S1, S2, S5, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C> extends Z<
  W1 | W2,
  S1 & S5,
  S3 | S4,
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _multiTag = Tags.Match
  constructor(
    readonly z: Z<W, S1, S2, R, E, A>,
    readonly onFailure: (ws: ReadonlyArray<W>, e: Cause<E>) => Z<W1, S5, S3, R1, E1, B>,
    readonly onSuccess: (ws: ReadonlyArray<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
  ) {
    super()
  }
}

class Asks<W, R0, S1, S2, R, E, A> extends Z<W, S1, S2, R0 & R, E, A> {
  readonly _multiTag = Tags.Asks
  constructor(readonly asks: (r: R0) => Z<W, S1, S2, R, E, A>) {
    super()
  }
}

class Give<W, S1, S2, R, E, A> extends Z<W, S1, S2, unknown, E, A> {
  readonly _multiTag = Tags.Give
  constructor(readonly z: Z<W, S1, S2, R, E, A>, readonly env: R) {
    super()
  }
}

class Tell<W> extends Z<W, unknown, never, unknown, never, void> {
  readonly _multiTag = Tags.Tell
  constructor(readonly log: ReadonlyArray<W>) {
    super()
  }
}

class Censor<W, S1, S2, R, E, A, W1> extends Z<W1, S1, S2, R, E, A> {
  readonly _multiTag = Tags.Censor
  constructor(readonly z: Z<W, S1, S2, R, E, A>, readonly modifyLog: (ws: ReadonlyArray<W>) => ReadonlyArray<W1>) {
    super()
  }
}

type Instruction =
  | Succeed<any>
  | Fail<any>
  | Modify<any, any, any>
  | Bind<any, any, any, any, any, any, any, any, any, any, any>
  | Match<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
  | Asks<any, any, any, any, any, any, any>
  | Give<any, any, any, any, any, any>
  | DeferTotal<any, any, any, any, any, any>
  | EffectTotal<any>
  | EffectPartial<any, any>
  | DeferPartial<any, any, any, any, any, any, any>
  | Tell<any>
  | Censor<any, any, any, any, any, any, any>

/*
 * -------------------------------------------
 * constructors
 * -------------------------------------------
 */

export function succeed<A, W = never, S1 = unknown, S2 = never>(a: A): Z<W, S1, S2, unknown, never, A> {
  return new Succeed(a)
}

export function effectTotal<A, W = never, S1 = unknown, S2 = never>(effect: () => A): Z<W, S1, S2, unknown, never, A> {
  return new EffectTotal(effect)
}

export function halt<E>(cause: Cause<E>): Z<never, unknown, never, unknown, E, never> {
  return new Fail(cause)
}

export function fail<E>(e: E): Z<never, unknown, never, unknown, E, never> {
  return halt(FS.single(e))
}

export function deferTotal<W, S1, S2, R, E, A>(ma: () => Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, E, A> {
  return new DeferTotal(ma)
}

export function defer<W, S1, S2, R, E, A>(ma: () => Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, unknown, A> {
  return new DeferPartial(ma, P.identity)
}

export function deferCatch_<W, S1, S2, R, E, A, E1>(
  ma: () => Z<W, S1, S2, R, E, A>,
  f: (e: unknown) => E1
): Z<W, S1, S2, R, E | E1, A> {
  return new DeferPartial(ma, f)
}

export function deferCatch<E1>(
  onThrow: (e: unknown) => E1
): <W, S1, S2, R, E, A>(ma: () => Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E | E1, A> {
  return (ma) => deferCatch_(ma, onThrow)
}

export function effect<A>(effect: () => A): Z<never, unknown, never, unknown, unknown, A> {
  return new EffectPartial(effect, P.identity)
}

export function effectCatch_<A, E>(
  effect: () => A,
  onThrow: (reason: unknown) => E
): Z<never, unknown, never, unknown, E, A> {
  return new EffectPartial(effect, onThrow)
}

export function effectCatch<E>(
  onThrow: (reason: unknown) => E
): <A>(effect: () => A) => Z<never, unknown, never, unknown, E, A> {
  return (effect) => effectCatch_(effect, onThrow)
}

/*
 * -------------------------------------------
 * State
 * -------------------------------------------
 */

/**
 * Constructs a computation from the specified modify function
 */
export function modify<S1, S2, A>(f: (s: S1) => readonly [A, S2]): Z<never, S1, S2, unknown, never, A> {
  return new Modify(f)
}

/**
 * Constructs a computation that may fail from the specified modify function.
 */
export function modifyEither<S1, S2, E, A>(
  f: (s: S1) => E.Either<E, readonly [A, S2]>
): Z<never, S1, S2, unknown, E, A> {
  return P.pipe(
    get<S1>(),
    map(f),
    bind(
      E.match(fail, ([a, s2]) =>
        P.pipe(
          succeed(a),
          mapState(() => s2)
        )
      )
    )
  )
}

/**
 * Like `map`, but also allows the state to be modified.
 */
export function transform_<W, S1, S2, R, E, A, S3, B>(
  ma: Z<W, S1, S2, R, E, A>,
  f: (s: S2, a: A) => readonly [B, S3]
): Z<W, S1, S3, R, E, B> {
  return bind_(ma, (a) => modify((s) => f(s, a)))
}

/**
 * Like `map`, but also allows the state to be modified.
 */
export function transform<S2, A, S3, B>(
  f: (s: S2, a: A) => readonly [B, S3]
): <W, S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S3, R, E, B> {
  return (ma) => transform_(ma, f)
}

/**
 * Constructs a computation that returns the initial state unchanged.
 */
export function get<S>(): Z<never, S, S, unknown, never, S> {
  return modify((s) => [s, s])
}

export function gets<S, A>(f: (s: S) => A): Z<never, S, S, unknown, never, A> {
  return modify((s) => [f(s), s])
}

/**
 * Constructs a computation that sets the state to the specified value.
 */
export function put<S>(s: S): Z<never, unknown, S, unknown, never, void> {
  return modify(() => [undefined, s])
}

/**
 * Constructs a computation from the specified update function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function update<S1, S2>(f: (s: S1) => S2): Z<never, S1, S2, unknown, never, void> {
  return modify((s) => [undefined, f(s)])
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapState_<S0, W, S1, S2, R, E, A>(
  fa: Z<W, S1, S2, R, E, A>,
  f: (s: S0) => S1
): Z<W, S0, S2, R, E, A> {
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
): <W, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S0, S2, R, E, A> {
  return (fa) => contramapState_(fa, f)
}

/**
 * Modifies the current state with the specified function
 */
export function mapState_<W, S1, S2, R, E, A, S3>(ma: Z<W, S1, S2, R, E, A>, f: (s: S2) => S3): Z<W, S1, S3, R, E, A> {
  return transform_(ma, (s, a) => [a, f(s)])
}

/**
 * Modifies the current state with the specified function
 */
export function mapState<S2, S3>(
  f: (s: S2) => S3
): <W, S1, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S3, R, E, A> {
  return (ma) => mapState_(ma, f)
}

/**
 * Provides this computation with its initial state.
 */
export function giveState_<W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>, s: S1): Z<W, unknown, S2, R, E, A> {
  return put(s)['*>'](ma)
}

/**
 * Provides this computation with its initial state.
 */
export function giveState<S1>(s: S1): <W, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, unknown, S2, R, E, A> {
  return (ma) => giveState_(ma, s)
}

/*
 * -------------------------------------------
 * Match
 * -------------------------------------------
 */

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success. More powerful
 * than `matchCauseM` by providing the current state of the log as an argument in
 * each case
 *
 * @note the log is cleared after being provided
 */
export function matchLogCauseM_<W, S1, S2, R, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (ws: ReadonlyArray<W>, e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (ws: ReadonlyArray<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return new Match(fa, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success. More powerful
 * than `matchCauseM` by providing the current state of the log as an argument in
 * each case
 *
 * @note the log is cleared after being provided
 */
export function matchLogCauseM<W, S1, S2, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (ws: ReadonlyArray<W>, e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (ws: ReadonlyArray<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): <R>(fa: Z<W, S1, S2, R, E, A>) => Z<W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchLogCauseM_(fa, onFailure, onSuccess)
}

export function matchCauseM_<W, S1, S2, R, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W | W1 | W2, S0 & S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return matchLogCauseM_(
    fa,
    (ws, e) =>
      P.pipe(
        onFailure(e),
        censor((w1s) => A.concatW_(ws, w1s))
      ),
    (ws, a) =>
      P.pipe(
        onSuccess(a),
        censor((w2s) => A.concatW_(ws, w2s))
      )
  )
}

export function matchCauseM<S1, S2, E, A, W1, S0, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (e: Cause<E>) => Z<W1, S0, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): <W, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1 | W2, S1 & S0, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchCauseM_(fa, onFailure, onSuccess)
}

export function matchLogM_<W, S1, S5, S2, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (ws: ReadonlyArray<W>, e: E) => Z<W1, S5, S3, R1, E1, B>,
  onSuccess: (ws: ReadonlyArray<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W | W1 | W2, S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return matchLogCauseM_(fa, (ws, e) => onFailure(ws, FS.first(e)), onSuccess)
}

export function matchLogM<W, S1, S2, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (ws: ReadonlyArray<W>, e: E) => Z<W1, S1, S3, R1, E1, B>,
  onSuccess: (ws: ReadonlyArray<W>, a: A) => Z<W2, S2, S4, R2, E2, C>
): <R>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => matchLogM_(fa, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchM_<W, S1, S5, S2, R, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Z<W1, S5, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): Z<W | W1 | W2, S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return matchCauseM_(fa, P.flow(FS.first, onFailure), onSuccess)
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchM<S1, S2, E, A, W1, S3, R1, E1, B, W2, S4, R2, E2, C>(
  onFailure: (e: E) => Z<W1, S1, S3, R1, E1, B>,
  onSuccess: (a: A) => Z<W2, S2, S4, R2, E2, C>
): <W, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1 | W2, S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
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
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): Z<W, S1, S2, R, never, B | C> {
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
): <W, S1, S2, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, never, B | C> {
  return (fa) => match_(fa, onFailure, onSuccess)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export function alt_<W, S1, S2, R, E, A, W1, S3, R1, E1, A1>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: () => Z<W1, S1, S3, R1, E1, A1>
): Z<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1> {
  return matchM_(fa, () => fb(), succeed)
}

export function alt<W1, S1, S3, R1, E1, A1>(
  fb: () => Z<W1, S1, S3, R1, E1, A1>
): <W, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2 | S3, R & R1, E | E1, A | A1> {
  return (fa) => alt_(fa, fb)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<A, S1 = unknown, S2 = never>(a: A): Z<never, S1, S2, unknown, never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function cross_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, P.tuple)
}

export function cross<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossPar_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, P.tuple)
}

export function crossPar<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function crossWith_<W, S, R, E, A, R1, E1, B, C>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): Z<W, S, S, R & R1, E | E1, C> {
  return bind_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<W, S, A, R1, E1, B, C>(
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R1 & R, E1 | E, C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function crossWithPar_<W, S, R, E, A, R1, E1, B, C>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): Z<W, S, S, R & R1, E | E1, C> {
  return P.pipe(
    fa,
    matchCauseM(
      (c1) =>
        P.pipe(
          fb,
          matchCauseM(
            (c2) => halt(FS.both(c1, c2)),
            (_) => halt(c1)
          )
        ),
      (a) => map_(fb, (b) => f(a, b))
    )
  )
}

export function crossWithPar<W, S, A, R1, E1, B, C>(
  fb: Z<W, S, S, R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(ma: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, C> {
  return (ma) => crossWithPar_(ma, fb, f)
}

export function ap_<W, S, R, E, A, R1, E1, B>(
  fab: Z<W, S, S, R, E, (a: A) => B>,
  fa: Z<W, S, S, R1, E1, A>
): Z<W, S, S, R1 & R, E1 | E, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<W, S, R1, E1, A>(
  fa: Z<W, S, S, R1, E1, A>
): <R, E, B>(fab: Z<W, S, S, R, E, (a: A) => B>) => Z<W, S, S, R1 & R, E1 | E, B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function apl<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<W, S, R, E, A, R1, E1, B>(
  fa: Z<W, S, S, R, E, A>,
  fb: Z<W, S, S, R1, E1, B>
): Z<W, S, S, R & R1, E | E1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function apr<W, S, R1, E1, B>(
  fb: Z<W, S, S, R1, E1, B>
): <R, E, A>(fa: Z<W, S, S, R, E, A>) => Z<W, S, S, R & R1, E | E1, B> {
  return (fa) => apr_(fa, fb)
}

/*
 * -------------------------------------------
 * Zip
 * -------------------------------------------
 */

export function zip_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>
): Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]> {
  return zipWith_(fa, fb, P.tuple)
}

export function zip<W1, S2, S3, Q, D, B>(
  fb: Z<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, Q & R, D | E, readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function zipWith_<W, S1, S2, R, E, A, W1, S3, Q, D, B, C>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): Z<W | W1, S1, S3, Q & R, D | E, C> {
  return bind_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function zipWith<W1, A, S2, S3, R1, E1, B, C>(
  fb: Z<W1, S2, S3, R1, E1, B>,
  f: (a: A, b: B) => C
): <W, S1, R, E>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, R1 & R, E1 | E, C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zap_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  fab: Z<W, S1, S2, R, E, (a: A) => B>,
  fa: Z<W1, S2, S3, R1, E1, A>
): Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return zipWith_(fab, fa, (f, a) => f(a))
}

export function zap<W1, S2, S3, R1, E1, A>(
  fa: Z<W1, S2, S3, R1, E1, A>
): <W, S1, R, E, B>(fab: Z<W, S1, S2, R, E, (a: A) => B>) => Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return (fab) => zap_(fab, fa)
}

export function zipl_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>
): Z<W | W1, S1, S3, Q & R, D | E, A> {
  return zipWith_(fa, fb, (a, _) => a)
}

export function zipl<W1, S2, S3, Q, D, B>(
  fb: Z<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, Q & R, D | E, A> {
  return (fa) => zipl_(fa, fb)
}

export function zipr_<W, S1, S2, R, E, A, W1, S3, Q, D, B>(
  fa: Z<W, S1, S2, R, E, A>,
  fb: Z<W1, S2, S3, Q, D, B>
): Z<W | W1, S1, S3, Q & R, D | E, B> {
  return zipWith_(fa, fb, (_, b) => b)
}

export function zipr<W1, S2, S3, Q, D, B>(
  fb: Z<W1, S2, S3, Q, D, B>
): <W, S1, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, Q & R, D | E, B> {
  return (fa) => zipr_(fa, fb)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<W, S1, S2, R, E, A, G, B>(
  pab: Z<W, S1, S2, R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): Z<W, S1, S2, R, G, B> {
  return matchM_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  )
}

export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <W, S1, S2, R>(pab: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<W, S1, S2, R, E, A, G>(pab: Z<W, S1, S2, R, E, A>, f: (e: E) => G): Z<W, S1, S2, R, G, A> {
  return matchM_(pab, (e) => fail(f(e)), succeed)
}

export function mapError<E, G>(f: (e: E) => G): <W, S1, S2, R, A>(pab: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, G, A> {
  return (pab) => mapError_(pab, f)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export function attempt<W, S1, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R, never, E.Either<E, A>> {
  return matchM_(
    fa,
    (e) => succeed(E.Left(e)),
    (a) => succeed(E.Right(a))
  )
}

export function refail<W, S1, S2, R, E, E1, A>(fa: Z<W, S1, S2, R, E, E.Either<E1, A>>): Z<W, S1, S2, R, E | E1, A> {
  return bind_(fa, E.match(fail, succeed))
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<W, S1, S2, R, E, A, B>(fa: Z<W, S1, S2, R, E, A>, f: (a: A) => B): Z<W, S1, S2, R, E, B> {
  return bind_(fa, (a) => succeed(f(a)))
}

export function map<A, B>(f: (a: A) => B): <W, S1, S2, R, E>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  ma: Z<W, S1, S2, R, E, A>,
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return new Bind(ma, f)
}

export function bind<A, W1, S2, S3, R1, E1, B>(
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): <W, S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, R1 & R, E1 | E, B> {
  return (ma) => bind_(ma, f)
}

export function tap_<W, S1, S2, R, E, A, W1, S3, R1, E1, B>(
  ma: Z<W, S1, S2, R, E, A>,
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return bind_(ma, (a) => map_(f(a), () => a))
}

export function tap<S2, A, W1, S3, R1, E1, B>(
  f: (a: A) => Z<W1, S2, S3, R1, E1, B>
): <W, S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return (ma) => tap_(ma, f)
}

export function flatten<W, S1, S2, R, E, A, W1, S3, R1, E1>(
  mma: Z<W, S1, S2, R, E, Z<W1, S2, S3, R1, E1, A>>
): Z<W | W1, S1, S3, R1 & R, E1 | E, A> {
  return bind_(mma, P.identity)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): Z<never, unknown, never, R, never, R> {
  return new Asks((r: R) => succeed(r))
}

export function asksM<R0, W, S1, S2, R, E, A>(f: (r: R0) => Z<W, S1, S2, R, E, A>): Z<W, S1, S2, R & R0, E, A> {
  return new Asks(f)
}

export function asks<R0, A>(f: (r: R0) => A): Z<never, unknown, never, R0, never, A> {
  return asksM((r: R0) => succeed(f(r)))
}

export function giveAll_<W, S1, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>, r: R): Z<W, S1, S2, unknown, E, A> {
  return new Give(fa, r)
}

export function giveAll<R>(r: R): <W, S1, S2, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, unknown, E, A> {
  return (fa) => giveAll_(fa, r)
}

export function gives_<R0, W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>, f: (r0: R0) => R): Z<W, S1, S2, R0, E, A> {
  return asksM((r: R0) => giveAll_(ma, f(r)))
}

export function gives<R0, R>(f: (r0: R0) => R): <W, S1, S2, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R0, E, A> {
  return (ma) => gives_(ma, f)
}

export function give_<W, S1, S2, R, E, A, R0>(ma: Z<W, S1, S2, R & R0, E, A>, r: R): Z<W, S1, S2, R0, E, A> {
  return gives_(ma, (r0) => ({ ...r, ...r0 }))
}

export function give<R>(r: R): <W, S1, S2, R0, E, A>(ma: Z<W, S1, S2, R & R0, E, A>) => Z<W, S1, S2, R0, E, A> {
  return (ma) => give_(ma, r)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Z<never, unknown, never, unknown, never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------
 * Writer
 * -------------------------------------------
 */

/**
 * Erases the current log
 */
export function erase<W, S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>): Z<never, S1, S2, R, E, A> {
  return censor_(wa, () => [])
}

/**
 * Modifies the current log with the specified function
 */
export function censor_<W, S1, S2, R, E, A, W1>(
  wa: Z<W, S1, S2, R, E, A>,
  f: (ws: ReadonlyArray<W>) => ReadonlyArray<W1>
): Z<W1, S1, S2, R, E, A> {
  return new Censor(wa, f)
}

/**
 * Modifies the current log with the specified function
 */
export function censor<W, W1>(
  f: (ws: ReadonlyArray<W>) => ReadonlyArray<W1>
): <S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>) => Z<W1, S1, S2, R, E, A> {
  return (wa) => censor_(wa, f)
}

/**
 * Constructs a computation
 */
export function tellAll<W>(ws: ReadonlyArray<W>): Z<W, unknown, never, unknown, never, void> {
  return new Tell(ws)
}

export function tell<W>(w: W): Z<W, unknown, never, unknown, never, void> {
  return tellAll([w])
}

export function writeAll_<W, S1, S2, R, E, A, W1>(
  ma: Z<W, S1, S2, R, E, A>,
  ws: ReadonlyArray<W1>
): Z<W | W1, S1, S2, R, E, A> {
  return censor_(ma, A.concatW(ws))
}

export function writeAll<W1>(
  ws: ReadonlyArray<W1>
): <W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2, R, E, A> {
  return (ma) => writeAll_(ma, ws)
}

export function write_<W, S1, S2, R, E, A, W1>(ma: Z<W, S1, S2, R, E, A>, w: W1): Z<W | W1, S1, S2, R, E, A> {
  return writeAll_(ma, [w])
}

export function write<W1>(w: W1): <W, S1, S2, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W | W1, S1, S2, R, E, A> {
  return (ma) => write_(ma, w)
}

export function listen<W, S1, S2, R, E, A>(
  wa: Z<W, S1, S2, R, E, A>
): Z<W, S1, S2, R, E, readonly [A, ReadonlyArray<W>]> {
  return matchLogCauseM_(
    wa,
    (_, e) => halt(e),
    (ws, a) => succeed([a, ws])
  )
}

export function listens_<W, S1, S2, R, E, A, B>(
  wa: Z<W, S1, S2, R, E, A>,
  f: (l: ReadonlyArray<W>) => B
): Z<W, S1, S2, R, E, readonly [A, B]> {
  return P.pipe(
    wa,
    listen,
    map(([a, ws]) => [a, f(ws)])
  )
}

export function listens<W, B>(
  f: (l: ReadonlyArray<W>) => B
): <S1, S2, R, E, A>(wa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, readonly [A, B]> {
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
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Z<W, S1, S3, R1, E1, B>
): Z<W, S1, S3, R & R1, E1, A | B> {
  return matchM_(fa, onFailure, (a) => succeed(a))
}

/**
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll<W, S1, E, S3, R1, E1, B>(
  onFailure: (e: E) => Z<W, S1, S3, R1, E1, B>
): <S2, R, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S3, R & R1, E1, B | A> {
  return (fa) => catchAll_(fa, onFailure)
}

export function catchSome_<W, S1, S2, R, E, A, S3, R1, E1, B>(
  fa: Z<W, S1, S2, R, E, A>,
  f: (e: E) => O.Option<Z<W, S1, S3, R1, E1, B>>
): Z<W, S1, S2 | S3, R & R1, E | E1, A | B> {
  return catchAll_(
    fa,
    P.flow(
      f,
      O.getOrElse((): Z<W, S1, S2 | S3, R & R1, E | E1, A | B> => fa)
    )
  )
}

export function catchSome<W, S1, E, S3, R1, E1, B>(
  f: (e: E) => O.Option<Z<W, S1, S3, R1, E1, B>>
): <S2, R, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2 | S3, R & R1, E | E1, B | A> {
  return (fa) => catchSome_(fa, f)
}

/**
 * Repeats this computation the specified number of times (or until the first failure)
 * passing the updated state to each successive repetition.
 *
 * @category combinators
 * @since 1.0.0
 */
export function repeatN_<W, S1, S2 extends S1, R, E, A>(ma: Z<W, S1, S2, R, E, A>, n: number): Z<W, S1, S2, R, E, A> {
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
): <W, S1, S2 extends S1, R, E, A>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, A> {
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
  ma: Z<W, S1, S2, R, E, A>,
  predicate: Predicate<A>
): Z<W, S1, S2, R, E, A> {
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
): <W, S1, S2 extends S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, A> {
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
): <W, S1, S2 extends S1, R, E>(ma: Z<W, S1, S2, R, E, A>, value: () => A) => Z<W, S1, S2, R, E, A> {
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
): (value: () => A) => <W, S1, S2 extends S1, R, E>(ma: Z<W, S1, S2, R, E, A>) => Z<W, S1, S2, R, E, A> {
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
export function either<W, S1, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>): Z<W, S1, S1 | S2, R, never, E.Either<E, A>> {
  return match_(fa, E.Left, E.Right)
}

export function orElse_<W, S1, S2, R, E, A, S3, S4, R1, E1>(
  fa: Z<W, S1, S2, R, E, A>,
  onFailure: (e: E) => Z<W, S3, S4, R1, E1, A>
): Z<W, S1 & S3, S2 | S4, R & R1, E1, A> {
  return matchM_(fa, onFailure, succeed)
}

export function orElse<W, E, A, S3, S4, R1, E1>(
  onFailure: (e: E) => Z<W, S3, S4, R1, E1, A>
): <S1, S2, R>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1 & S3, S4 | S2, R & R1, E1, A> {
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
  fa: Z<W, S1, S2, R, E, A>,
  that: Z<W, S3, S4, R1, E1, A1>
): Z<W, S1 & S3, S2 | S4, R & R1, E1, E.Either<A, A1>> {
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
  that: Z<W, S3, S4, R1, E1, A1>
): <S1, S2, R, E, A>(fa: Z<W, S1, S2, R, E, A>) => Z<W, S1 & S3, S4 | S2, R & R1, E1, E.Either<A, A1>> {
  return (fa) => orElseEither_(fa, that)
}

/*
 * -------------------------------------------
 * Foreach
 * -------------------------------------------
 */

function _MonoidBindUnit<W, S, R, E>(): P.Monoid<Z<W, S, S, R, E, void>> {
  return P.Monoid<Z<W, S, S, R, E, void>>((x, y) => bind_(x, () => y), unit())
}

export function iforeachUnit_<A, W, S, R, E>(
  as: Iterable<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): Z<W, S, S, R, E, void> {
  return I.ifoldMap_(_MonoidBindUnit<W, S, R, E>())(as, f)
}

export function iforeachUnit<A, W, S, R, E>(
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): (as: Iterable<A>) => Z<W, S, S, R, E, void> {
  return (as) => iforeachUnit_(as, f)
}

export function iforeach_<W, S, R, E, A, B>(
  as: Iterable<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, ReadonlyArray<B>> {
  return I.ifoldl_(as, succeed([]) as Z<W, S, S, R, E, Array<B>>, (b, i, a) =>
    crossWith_(
      b,
      deferTotal(() => f(i, a)),
      (acc, a) => {
        acc.push(a)
        return acc
      }
    )
  )
}

export function iforeach<A, W, S, R, E, B>(
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): (as: Iterable<A>) => Z<W, S, S, R, E, ReadonlyArray<B>> {
  return (as) => iforeach_(as, f)
}

export function foreach_<A, W, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, ReadonlyArray<B>> {
  return iforeach_(as, (_, a) => f(a))
}

export function foreach<A, W, S, R, E, B>(
  f: (a: A) => Z<W, S, S, R, E, B>
): (as: Iterable<A>) => Z<W, S, S, R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f)
}

export function iforeachArrayUnit_<A, W, S, R, E>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): Z<W, S, S, R, E, void> {
  return A.ifoldMap_(_MonoidBindUnit<W, S, R, E>())(as, f)
}

export function iforeachArrayUnit<A, W, S, R, E>(
  f: (i: number, a: A) => Z<W, S, S, R, E, void>
): (as: ReadonlyArray<A>) => Z<W, S, S, R, E, void> {
  return (as) => iforeachArrayUnit_(as, f)
}

export function iforeachArray_<A, W, S, R, E, B>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): Z<W, S, S, R, E, ReadonlyArray<B>> {
  return A.ifoldl_(as, succeed([]) as Z<W, S, S, R, E, Array<B>>, (b, i, a) =>
    crossWith_(
      b,
      deferTotal(() => f(i, a)),
      (acc, a) => {
        acc.push(a)
        return acc
      }
    )
  )
}

export function iforeachArray<A, W, S, R, E, B>(
  f: (i: number, a: A) => Z<W, S, S, R, E, B>
): (as: ReadonlyArray<A>) => Z<W, S, S, R, E, ReadonlyArray<B>> {
  return (as) => iforeachArray_(as, f)
}

/*
 * -------------------------------------------
 * Runtime
 * -------------------------------------------
 */

class MatchFrame {
  readonly _multiTag = 'MatchFrame'
  constructor(
    readonly failure: (e: any) => Z<any, any, any, any, any, any>,
    readonly apply: (a: any) => Z<any, any, any, any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _multiTag = 'ApplyFrame'
  constructor(readonly apply: (e: any) => Z<any, any, any, any, any, any>) {}
}

type Frame = MatchFrame | ApplyFrame

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runAll_<W, S1, S2, E, A>(
  ma: Z<W, S1, S2, unknown, E, A>,
  s: S1
): readonly [ReadonlyArray<W>, E.Either<Cause<E>, readonly [S2, A]>] {
  let frames = undefined as Stack<Frame> | undefined

  let s0            = s as any
  let result: any   = null
  const environment = undefined as Stack<any> | undefined
  let failed        = false
  let current       = ma as Z<any, any, any, any, any, any> | undefined
  let log           = Array<W>()

  function popContinuation() {
    const current = frames?.value
    frames        = frames?.previous
    return current
  }

  function pushContinuation(cont: Frame) {
    frames = makeStack(cont, frames)
  }

  function popEnv() {
    const current = environment?.value
    frames        = environment?.previous
    return current
  }

  function pushEnv(env: any) {
    frames = makeStack(env, environment)
  }

  function findNextErrorHandler() {
    let unwinding = true
    while (unwinding) {
      const next = popContinuation()

      if (next == null) {
        unwinding = false
      } else {
        if (next._multiTag === 'MatchFrame') {
          unwinding = false
          pushContinuation(new ApplyFrame(next.failure))
        }
      }
    }
  }

  while (current != null) {
    const I = current[_ZI]

    switch (I._multiTag) {
      case Tags.Bind: {
        current = I.z[_ZI]
        pushContinuation(new ApplyFrame(I.cont))
        break
      }
      case Tags.EffectTotal: {
        result                = I.effect()
        const nextInstruction = popContinuation()
        if (nextInstruction) {
          current = nextInstruction.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case Tags.EffectPartial: {
        try {
          current = succeed(I.effect())
        } catch (e) {
          current = fail(I.onThrow(e))
        }
        break
      }
      case Tags.DeferTotal: {
        current = I.z()
        break
      }
      case Tags.DeferPartial: {
        try {
          current = I.z()
        } catch (e) {
          current = fail(I.onThrow(e))
        }
        break
      }
      case Tags.Succeed: {
        result          = I.value
        const nextInstr = popContinuation()
        if (nextInstr) {
          current = nextInstr.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case Tags.Fail: {
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
      case Tags.Match: {
        current     = I.z
        const state = s0
        pushContinuation(
          new MatchFrame(
            (cause: Cause<any>) => {
              const m = put(state)['*>'](I.onFailure(log, cause))
              log     = []
              return m
            },
            (a) => {
              const m = I.onSuccess(log, a)
              log     = []
              return m
            }
          )
        )
        break
      }
      case Tags.Asks: {
        current = I.asks(environment?.value || {})
        break
      }
      case Tags.Give: {
        pushEnv(I.env)
        current = matchM_(
          I.z,
          (e) => succeed(popEnv())['*>'](fail(e)),
          (a) => succeed(popEnv())['*>'](succeed(a))
        )
        break
      }
      case Tags.Modify: {
        const updated  = I.run(s0)
        s0             = updated[1]
        result         = updated[0]
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case Tags.Tell: {
        log            = I.log as Array<W>
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case Tags.Censor: {
        current = I.z
        pushContinuation(
          new MatchFrame(
            (cause: Cause<any>) => {
              log = I.modifyLog(log) as Array<W>
              return halt(cause)
            },
            (a) => {
              log = I.modifyLog(log) as Array<W>
              return succeed(a)
            }
          )
        )
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
): <W, S2, E, A>(fa: Z<W, S1, S2, unknown, E, A>) => readonly [ReadonlyArray<W>, E.Either<Cause<E>, readonly [S2, A]>] {
  return (fa) => runAll_(fa, s)
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export function run_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): readonly [S2, A] {
  return (runAll_(ma, s) as [ReadonlyArray<W>, E.Right<readonly [S2, A]>])[1].right
}

/**
 * Runs this computation with the specified initial state, returning both
 * updated state and the result
 */
export function run<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => readonly [S2, A] {
  return (ma) => run_(ma, s)
}

/**
 * Runs this computation, returning the result.
 */
export function runResult<W, A>(ma: Z<W, unknown, unknown, unknown, never, A>): A {
  return run_(ma, {})[1]
}

/**
 * Runs this computation with the given environment, returning the result.
 */
export function runReader_<W, R, A>(ma: Z<W, unknown, never, R, never, A>, r: R): A {
  return runResult(giveAll_(ma, r))
}

/**
 * Runs this computation with the given environment, returning the result.
 */
export function runReader<R>(r: R): <W, A>(ma: Z<W, unknown, never, R, never, A>) => A {
  return (ma) => runReader_(ma, r)
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export function runState_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): S2 {
  return run_(ma, s)[0]
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export function runState<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => S2 {
  return (ma) => runState_(ma, s)
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runStateResult_<W, S1, S2, A>(ma: Z<W, S1, S2, unknown, never, A>, s: S1): A {
  return (runAll_(ma, s) as readonly [ReadonlyArray<W>, E.Right<readonly [S2, A]>])[1].right[1]
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runStateResult<S1>(s: S1): <W, S2, A>(ma: Z<W, S1, S2, unknown, never, A>) => A {
  return (ma) => runStateResult_(ma, s)
}

/**
 * Runs this computation returning either the result or error
 */
export function runEither<E, A>(ma: Z<never, unknown, unknown, unknown, E, A>): E.Either<E, A> {
  return P.pipe(
    runAll_(ma, {} as never)[1],
    E.map(([, x]) => x),
    E.mapLeft(FS.first)
  )
}

export function runReaderEither_<R, E, A>(ma: Z<never, unknown, unknown, R, E, A>, env: R): E.Either<E, A> {
  return runEither(giveAll_(ma, env))
}

export function runReaderEither<R>(env: R): <E, A>(ma: Z<never, unknown, unknown, R, E, A>) => E.Either<E, A> {
  return (ma) => runReaderEither_(ma, env)
}

export function runWriter<W, A>(ma: Z<W, unknown, unknown, unknown, never, A>): readonly [ReadonlyArray<W>, A] {
  const [log, result] = runAll_(ma, {}) as readonly [ReadonlyArray<W>, E.Right<[never, A]>]
  return [log, result.right[1]]
}

/*
 * -------------------------------------------
 * instances
 * -------------------------------------------
 */

type URI = [HKT.URI<ZURI>]

export type V = HKT.V<'W', '_'> & HKT.V<'S', '_'> & HKT.V<'R', '-'> & HKT.V<'E', '+'>

export const Functor = P.Functor<URI, V>({ map_ })

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({ map_, crossWith_, cross_ })

export const Apply = P.Apply<URI, V>({ map_, crossWith_, cross_, ap_ })

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({ map_, crossWith_, cross_, unit })

export const Applicative = P.Applicative<URI, V>({ map_, crossWith_, cross_, ap_, unit, pure })

export const ApplicativeExcept = P.ApplicativeExcept<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  fail,
  catchAll_
})

export const Monad = P.Monad<URI, V>({ map_, crossWith_, cross_, ap_, unit, pure, bind_, flatten })

export const MonadExcept = P.MonadExcept<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  fail,
  catchAll_
})

export const MonadEnv = P.MonadEnv<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  asks,
  giveAll_
})

export const MonadState = P.MonadState<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  get,
  gets,
  put,
  modify
})

export { ZURI } from './Modules'
