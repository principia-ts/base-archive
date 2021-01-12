import type { AsyncInstruction } from './Async'
import type * as I from './IO/core'
import type * as HKT from '@principia/base/HKT'
import type { Stack } from '@principia/base/util/support/Stack'

import * as E from '@principia/base/Either'
import { identity, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import { AtomicReference } from '@principia/base/util/support/AtomicReference'
import { makeStack } from '@principia/base/util/support/Stack'

import { ExternalFail, IOTag } from './IO/constants'

/*
 * -------------------------------------------
 * SIO Model
 * -------------------------------------------
 */

export const URI = 'SIO'

export type URI = typeof URI

export type V = HKT.V<'S', '_'> & HKT.V<'R', '-'> & HKT.V<'E', '+'>

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: SIO<S, S, R, E, A>
  }
}

export const _SI = '_SI'
export type _SI = typeof _SI

/**
 * `SIO<S1, S2, R, E, A>` is a purely functional description of a synchronous computation
 * that requires an environment `R` and an initial state `S1` and may either
 * fail with an `E` or succeed with an updated state `S2` and an `A`. Because
 * of its polymorphism `SIO` can be used to model a variety of effects
 * including context, state, and failure.
 *
 * Stateless `SIO` (without `S1` and `S2` parameters) is made to be type-compatible with `IO`,
 * and can automatically be lifted into `IO` computations.
 *
 * @since 1.0.0
 */
export abstract class SIO<S1, S2, R, E, A> {
  readonly _tag      = IOTag.Integration
  readonly _asyncTag = 'SIO'

  readonly _S1!: (_: S1) => void
  readonly _S2!: () => S2

  readonly _U = 'IO'
  readonly _E!: () => E
  readonly _A!: () => A
  readonly _R!: (_: R) => void

  get [_SI](): SIOInstruction {
    return this as any
  }

  get ['_AI'](): AsyncInstruction {
    return this as any
  }

  get ['_I'](): I.Instruction {
    const si = SIOtoIO.get
    if (si._tag === 'Some') {
      return si.value(this as any)['_I']
    }
    return new ExternalFail({
      _tag: 'Die',
      value: 'SIO-IO integration not implemented. Did you import the integration?'
    })
  }
}

export enum SIOInstructionTag {
  Succeed = 'Succeed',
  EffectTotal = 'EffectTotal',
  EffectPartial = 'EffectPartial',
  EffectSuspendTotal = 'EffectSuspendTotal',
  EffectSuspendPartial = 'EffectSuspendPartial',
  Fail = 'Fail',
  Modify = 'Modify',
  FlatMap = 'FlatMap',
  Fold = 'Fold',
  Asks = 'Asks',
  Give = 'Give'
}

class SucceedInstruction<A> extends SIO<unknown, never, unknown, never, A> {
  readonly _sio = SIOInstructionTag.Succeed
  constructor(readonly value: A) {
    super()
  }
}

class EffectTotalInstruction<A> extends SIO<unknown, never, unknown, never, A> {
  readonly _sio = SIOInstructionTag.EffectTotal
  constructor(readonly effect: () => A) {
    super()
  }
}

class EffectPartialInstruction<E, A> extends SIO<unknown, never, unknown, E, A> {
  readonly _sio = SIOInstructionTag.EffectPartial
  constructor(readonly effect: () => A, readonly onThrow: (u: unknown) => E) {
    super()
  }
}

class EffectSuspendTotalInstruction<S1, S2, R, E, A> extends SIO<S1, S2, R, E, A> {
  readonly _sio = SIOInstructionTag.EffectSuspendTotal
  constructor(readonly sio: () => SIO<S1, S2, R, E, A>) {
    super()
  }
}

class EffectSuspendPartialInstruction<S1, S2, R, E, A, E1> extends SIO<S1, S2, R, E | E1, A> {
  readonly _sio = SIOInstructionTag.EffectSuspendPartial
  constructor(readonly sio: () => SIO<S1, S2, R, E, A>, readonly onThrow: (u: unknown) => E1) {
    super()
  }
}

class FailInstruction<E> extends SIO<unknown, never, unknown, E, never> {
  readonly _sio = SIOInstructionTag.Fail
  constructor(readonly e: E) {
    super()
  }
}

class ModifyInstruction<S1, S2, A> extends SIO<S1, S2, unknown, never, A> {
  readonly _sio = SIOInstructionTag.Modify
  constructor(readonly run: (s1: S1) => readonly [S2, A]) {
    super()
  }
}

class FlatMapInstruction<S1, S2, R, E, A, S3, Q, D, B> extends SIO<S1, S3, Q & R, D | E, B> {
  readonly _sio = SIOInstructionTag.FlatMap
  constructor(readonly sio: SIO<S1, S2, R, E, A>, readonly f: (a: A) => SIO<S2, S3, Q, D, B>) {
    super()
  }
}
class FoldInstruction<S1, S2, S5, R, E, A, S3, R1, E1, B, S4, R2, E2, C> extends SIO<
  S1 & S5,
  S3 | S4,
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _sio = SIOInstructionTag.Fold
  constructor(
    readonly sio: SIO<S1, S2, R, E, A>,
    readonly onFailure: (e: E) => SIO<S5, S3, R1, E1, B>,
    readonly onSuccess: (a: A) => SIO<S2, S4, R2, E2, C>
  ) {
    super()
  }
}

class AsksInstruction<R0, S1, S2, R, E, A> extends SIO<S1, S2, R0 & R, E, A> {
  readonly _sio = SIOInstructionTag.Asks
  constructor(readonly f: (r: R0) => SIO<S1, S2, R, E, A>) {
    super()
  }
}

class GiveInstruction<S1, S2, R, E, A> extends SIO<S1, S2, unknown, E, A> {
  readonly _sio = SIOInstructionTag.Give
  constructor(readonly sio: SIO<S1, S2, R, E, A>, readonly r: R) {
    super()
  }
}

export type SIOInstruction =
  | SucceedInstruction<any>
  | FailInstruction<any>
  | ModifyInstruction<any, any, any>
  | FlatMapInstruction<any, any, any, any, any, any, any, any, any>
  | FoldInstruction<any, any, any, any, any, any, any, any, any, any, any, any, any, any>
  | AsksInstruction<any, any, any, any, any, any>
  | GiveInstruction<any, any, any, any, any>
  | EffectSuspendTotalInstruction<any, any, any, any, any>
  | EffectTotalInstruction<any>
  | EffectPartialInstruction<any, any>
  | EffectSuspendPartialInstruction<any, any, any, any, any, any>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * succeed :: a -> SIO _ _ _ _ a
 * ```
 */
export function succeed<A, S1 = unknown, S2 = never>(a: A): SIO<S1, S2, unknown, never, A> {
  return new SucceedInstruction(a)
}

export function effectTotal<A, S1 = unknown, S2 = never>(effect: () => A): SIO<S1, S2, unknown, never, A> {
  return new EffectTotalInstruction(effect)
}

export function fail<E>(e: E): SIO<unknown, never, unknown, E, never> {
  return new FailInstruction(e)
}

export function modify<S1, S2, A>(f: (s: S1) => readonly [S2, A]): SIO<S1, S2, unknown, never, A> {
  return new ModifyInstruction(f)
}

export function effectSuspendTotal<S1, S2, R, E, A>(sio: () => SIO<S1, S2, R, E, A>): SIO<S1, S2, R, E, A> {
  return new EffectSuspendTotalInstruction(sio)
}

export function effectSuspend<S1, S2, R, E, A>(sio: () => SIO<S1, S2, R, E, A>): SIO<S1, S2, R, unknown, A> {
  return new EffectSuspendPartialInstruction(sio, identity)
}

export function effectSuspendCatch_<S1, S2, R, E, A, E1>(
  sio: () => SIO<S1, S2, R, E, A>,
  f: (e: unknown) => E1
): SIO<S1, S2, R, E | E1, A> {
  return new EffectSuspendPartialInstruction(sio, f)
}

export function effectSuspendCatch<E1>(
  onThrow: (e: unknown) => E1
): <S1, S2, R, E, A>(sio: () => SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, E | E1, A> {
  return (sio) => effectSuspendCatch_(sio, onThrow)
}

export function effect<A>(effect: () => A): SIO<unknown, never, unknown, unknown, A> {
  return new EffectPartialInstruction(effect, identity)
}

export function effectCatch_<A, E>(
  effect: () => A,
  onThrow: (reason: unknown) => E
): SIO<unknown, never, unknown, E, A> {
  return new EffectPartialInstruction(effect, onThrow)
}

export function effectCatch<E>(
  onThrow: (reason: unknown) => E
): <A>(effect: () => A) => SIO<unknown, never, unknown, E, A> {
  return (effect) => effectCatch_(effect, onThrow)
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * ```haskell
 * foldM_ :: (
 *    SIO s1 s2 r e a,
 *    (e -> SIO s3 s4 r1 e1 b),
 *    (a -> SIO s2 s5 r2 e2 c)
 * ) -> SIO (s1 & s3) (s4 | s5) (r & r1 & r2) (b | c)
 * ```
 *
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldM_<S1, S5, S2, R, E, A, S3, R1, E1, B, S4, R2, E2, C>(
  fa: SIO<S1, S2, R, E, A>,
  onFailure: (e: E) => SIO<S5, S3, R1, E1, B>,
  onSuccess: (a: A) => SIO<S2, S4, R2, E2, C>
): SIO<S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return new FoldInstruction(fa, onFailure, onSuccess)
}

/**
 * ```haskell
 * foldM :: (
 *    (e -> SIO s3 s4 r1 e1 b),
 *    (a -> SIO s2 s5 r2 e2 c)
 * ) -> SIO s1 s2 r e a -> SIO (s1 & s3) (s4 | s5) (r & r1 & r2) (b | c)
 * ```
 *
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldM<S1, S2, E, A, S3, R1, E1, B, S4, R2, E2, C>(
  onFailure: (e: E) => SIO<S1, S3, R1, E1, B>,
  onSuccess: (a: A) => SIO<S2, S4, R2, E2, C>
): <R>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return (fa) => foldM_(fa, onFailure, onSuccess)
}

/**
 * ```haskell
 * fold_ :: (
 *    SIO s1 s2 r e a,
 *    (e -> b),
 *    (a -> c)
 * ) -> SIO s1 s2 r _ (b | c)
 * ```
 *
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fold_<S1, S2, R, E, A, B, C>(
  fa: SIO<S1, S2, R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): SIO<S1, S2, R, never, B | C> {
  return foldM_(
    fa,
    (e) => succeed(onFailure(e)),
    (a) => succeed(onSuccess(a))
  )
}

/**
 * ```haskell
 * fold :: ((e -> b), (a -> c)) -> SIO s1 s2 r e a -> SIO s1 s2 r _ (b | c)
 * ```
 *
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fold<E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
): <S1, S2, R>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, never, B | C> {
  return (fa) => fold_(fa, onFailure, onSuccess)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<A>(a: A): SIO<unknown, never, unknown, never, A> {
  return succeed(a)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function product_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, readonly [A, B]> {
  return map2_(fa, fb, tuple)
}

export function product<S2, S3, Q, D, B>(
  fb: SIO<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, readonly [A, B]> {
  return (fa) => product_(fa, fb)
}

export function map2_<S1, S2, R, E, A, S3, Q, D, B, C>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): SIO<S1, S3, Q & R, D | E, C> {
  return flatMap_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function map2<A, S2, S3, Q, D, B, C>(
  fb: SIO<S2, S3, Q, D, B>,
  f: (a: A, b: B) => C
): <S1, R, E>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, C> {
  return (fa) => map2_(fa, fb, f)
}

export function ap_<S1, S2, R, E, A, S3, Q, D, B>(
  fab: SIO<S1, S2, R, E, (a: A) => B>,
  fa: SIO<S2, S3, Q, D, A>
): SIO<S1, S3, Q & R, D | E, B> {
  return map2_(fab, fa, (f, a) => f(a))
}

export function ap<S2, S3, Q, D, A>(
  fa: SIO<S2, S3, Q, D, A>
): <S1, R, E, B>(fab: SIO<S1, S2, R, E, (a: A) => B>) => SIO<S1, S3, Q & R, D | E, B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, A> {
  return map2_(fa, fb, (a, _) => a)
}

export function apFirst<S2, S3, Q, D, B>(
  fb: SIO<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<S1, S2, R, E, A, S3, Q, D, B>(
  fa: SIO<S1, S2, R, E, A>,
  fb: SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, B> {
  return map2_(fa, fb, (_, b) => b)
}

export function apSecond<S2, S3, Q, D, B>(
  fb: SIO<S2, S3, Q, D, B>
): <S1, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, B> {
  return (fa) => apSecond_(fa, fb)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<S1, S2, R, E, A, G, B>(
  pab: SIO<S1, S2, R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): SIO<S1, S2, R, G, B> {
  return foldM_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  )
}

export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <S1, S2, R>(pab: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<S1, S2, R, E, A, G>(pab: SIO<S1, S2, R, E, A>, f: (e: E) => G): SIO<S1, S2, R, G, A> {
  return foldM_(pab, (e) => fail(f(e)), succeed)
}

export function mapError<E, G>(f: (e: E) => G): <S1, S2, R, A>(pab: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, G, A> {
  return (pab) => mapError_(pab, f)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export function recover<S1, S2, R, E, A>(fa: SIO<S1, S2, R, E, A>): SIO<S1, S2, R, never, E.Either<E, A>> {
  return foldM_(
    fa,
    (e) => succeed(E.left(e)),
    (a) => succeed(E.right(a))
  )
}

export function absolve<S1, S2, R, E, E1, A>(fa: SIO<S1, S2, R, E, E.Either<E1, A>>): SIO<S1, S2, R, E | E1, A> {
  return flatMap_(fa, E.fold(fail, succeed))
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<S1, S2, R, E, A, B>(fa: SIO<S1, S2, R, E, A>, f: (a: A) => B): SIO<S1, S2, R, E, B> {
  return flatMap_(fa, (a) => succeed(f(a)))
}

export function map<A, B>(f: (a: A) => B): <S1, S2, R, E>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function flatMap_<S1, S2, R, E, A, S3, Q, D, B>(
  ma: SIO<S1, S2, R, E, A>,
  f: (a: A) => SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, B> {
  return new FlatMapInstruction(ma, f)
}

export function flatMap<A, S2, S3, Q, D, B>(
  f: (a: A) => SIO<S2, S3, Q, D, B>
): <S1, R, E>(ma: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, B> {
  return (ma) => flatMap_(ma, f)
}

export function tap_<S1, S2, R, E, A, S3, Q, D, B>(
  ma: SIO<S1, S2, R, E, A>,
  f: (a: A) => SIO<S2, S3, Q, D, B>
): SIO<S1, S3, Q & R, D | E, A> {
  return flatMap_(ma, (a) => map_(f(a), () => a))
}

export function tap<S2, A, S3, Q, D, B>(
  f: (a: A) => SIO<S2, S3, Q, D, B>
): <S1, R, E>(ma: SIO<S1, S2, R, E, A>) => SIO<S1, S3, Q & R, D | E, A> {
  return (ma) => tap_(ma, f)
}

export function flatten<S1, S2, R, E, A, S3, Q, D>(
  mma: SIO<S1, S2, R, E, SIO<S2, S3, Q, D, A>>
): SIO<S1, S3, Q & R, D | E, A> {
  return flatMap_(mma, identity)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): SIO<unknown, never, R, never, R> {
  return new AsksInstruction((r: R) => succeed(r))
}

export function asksM<R0, S1, S2, R, E, A>(f: (r: R0) => SIO<S1, S2, R, E, A>): SIO<S1, S2, R & R0, E, A> {
  return new AsksInstruction(f)
}

export function asks<R0, A>(f: (r: R0) => A): SIO<unknown, never, R0, never, A> {
  return asksM((r: R0) => succeed(f(r)))
}

export function giveAll_<S1, S2, R, E, A>(fa: SIO<S1, S2, R, E, A>, r: R): SIO<S1, S2, unknown, E, A> {
  return new GiveInstruction(fa, r)
}

export function giveAll<R>(r: R): <S1, S2, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S2, unknown, E, A> {
  return (fa) => giveAll_(fa, r)
}

export function gives_<R0, S1, S2, R, E, A>(ma: SIO<S1, S2, R, E, A>, f: (r0: R0) => R): SIO<S1, S2, R0, E, A> {
  return asksM((r: R0) => giveAll_(ma, f(r)))
}

export function gives<R0, R>(f: (r0: R0) => R): <S1, S2, E, A>(ma: SIO<S1, S2, R, E, A>) => SIO<S1, S2, R0, E, A> {
  return (ma) => gives_(ma, f)
}

export function give_<S1, S2, R, E, A, R0>(ma: SIO<S1, S2, R & R0, E, A>, r: R): SIO<S1, S2, R0, E, A> {
  return gives_(ma, (r0) => ({ ...r, ...r0 }))
}

export function give<R>(r: R): <S1, S2, R0, E, A>(ma: SIO<S1, S2, R & R0, E, A>) => SIO<S1, S2, R0, E, A> {
  return (ma) => give_(ma, r)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): SIO<unknown, never, unknown, never, void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * ```haskell
 * catchAll_ :: (SIO s1 s2 r e a, (e -> SIO s1 s3 r1 e1 b)) ->
 *    SIO s1 s3 (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<S1, S2, R, E, A, S3, R1, E1, B>(
  fa: SIO<S1, S2, R, E, A>,
  onFailure: (e: E) => SIO<S1, S3, R1, E1, B>
): SIO<S1, S3, R & R1, E1, A | B> {
  return foldM_(fa, onFailure, (a) => succeed(a))
}

/**
 * ```haskell
 * catchAll_ :: (e -> SIO s1 s3 r1 e1 b) -> SIO s1 s2 r e a ->
 *    SIO s1 s3 (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll<S1, E, S3, R1, E1, B>(
  onFailure: (e: E) => SIO<S1, S3, R1, E1, B>
): <S2, R, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1, S3, R & R1, E1, B | A> {
  return (fa) => catchAll_(fa, onFailure)
}

/**
 * ```haskell
 * update :: (s1 -> s2) -> SIO s1 s2 _ _ ()
 * ```
 *
 * Constructs a computation from the specified update function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function update<S1, S2>(f: (s: S1) => S2): SIO<S1, S2, unknown, never, void> {
  return modify((s) => [f(s), undefined])
}

/**
 * ```haskell
 * contramapInput_ :: (SIO s1 s2 r e a, (s0 -> s1)) -> SIO s0 s2 r e a
 * ```
 *
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapInput_<S0, S1, S2, R, E, A>(fa: SIO<S1, S2, R, E, A>, f: (s: S0) => S1): SIO<S0, S2, R, E, A> {
  return flatMap_(update(f), () => fa)
}

/**
 * ```haskell
 * contramapInput :: (s0 -> s1) -> SIO s1 s2 r e a -> SIO s0 s2 r e a
 * ```
 *
 * Transforms the initial state of this computation` with the specified
 * function.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function contramapInput<S0, S1>(
  f: (s: S0) => S1
): <S2, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S0, S2, R, E, A> {
  return (fa) => contramapInput_(fa, f)
}

/**
 * ```haskell
 * either :: SIO s1 s2 r e a -> SIO s1 (s1 | s2) r _ (Either e a)
 * ```
 *
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function either<S1, S2, R, E, A>(fa: SIO<S1, S2, R, E, A>): SIO<S1, S1 | S2, R, never, E.Either<E, A>> {
  return fold_(fa, E.left, E.right)
}

export function orElse_<S1, S2, R, E, A, S3, S4, R1, E1>(
  fa: SIO<S1, S2, R, E, A>,
  onFailure: (e: E) => SIO<S3, S4, R1, E1, A>
): SIO<S1 & S3, S2 | S4, R & R1, E1, A> {
  return foldM_(fa, onFailure, succeed)
}

export function orElse<E, A, S3, S4, R1, E1>(
  onFailure: (e: E) => SIO<S3, S4, R1, E1, A>
): <S1, S2, R>(fa: SIO<S1, S2, R, E, A>) => SIO<S1 & S3, S4 | S2, R & R1, E1, A> {
  return (fa) => orElse_(fa, onFailure)
}

/**
 * ```haskell
 * orElseEither_ :: (SIO s1 s2 r e a, SIO s3 s4 r1 e1 a1) ->
 *    SIO (s1 & s3) (s2 | s4) (r & r1) e1 (Either a a1)
 * ```
 *
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElseEither_<S1, S2, R, E, A, S3, S4, R1, E1, A1>(
  fa: SIO<S1, S2, R, E, A>,
  that: SIO<S3, S4, R1, E1, A1>
): SIO<S1 & S3, S2 | S4, R & R1, E1, E.Either<A, A1>> {
  return foldM_(
    fa,
    () => map_(that, E.right),
    (a) => succeed(E.left(a))
  )
}

/**
 * ```haskell
 * orElseEither :: SIO s3 s4 r1 e1 a1 -> SIO s1 s2 r e a ->
 *    SIO (s1 & s3) (s2 | s4) (r & r1) e1 (Either a a1)
 * ```
 *
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElseEither<S3, S4, R1, E1, A1>(
  that: SIO<S3, S4, R1, E1, A1>
): <S1, S2, R, E, A>(fa: SIO<S1, S2, R, E, A>) => SIO<S1 & S3, S4 | S2, R & R1, E1, E.Either<A, A1>> {
  return (fa) => orElseEither_(fa, that)
}

/*
 * -------------------------------------------
 * Runtime
 * -------------------------------------------
 */

class FoldFrame {
  readonly _sio = 'FoldFrame'
  constructor(
    readonly failure: (e: any) => SIO<any, any, any, any, any>,
    readonly apply: (e: any) => SIO<any, any, any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _sio = 'ApplyFrame'
  constructor(readonly apply: (e: any) => SIO<any, any, any, any, any>) {}
}

type Frame = FoldFrame | ApplyFrame

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runStateEither_<S1, S2, E, A>(sio: SIO<S1, S2, unknown, E, A>, s: S1): E.Either<E, readonly [S2, A]> {
  let frames = undefined as Stack<Frame> | undefined

  let state       = s as any
  let result      = null
  let environment = null
  let failed      = false
  let current     = sio as SIO<any, any, any, any, any> | undefined

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
        if (next._sio === 'FoldFrame') {
          unwinding = false
          pushContinuation(new ApplyFrame(next.failure))
        }
      }
    }
  }

  while (current != null) {
    const I = current[_SI]

    switch (I._sio) {
      case SIOInstructionTag.FlatMap: {
        const nested       = I.sio[_SI]
        const continuation = I.f

        switch (nested._sio) {
          case SIOInstructionTag.Succeed: {
            current = continuation(nested.value)
            break
          }
          case SIOInstructionTag.EffectTotal: {
            current = continuation(nested.effect())
            break
          }
          case SIOInstructionTag.EffectPartial: {
            try {
              current = succeed(nested.effect())
            } catch (e) {
              current = fail(nested.onThrow(e))
            }
            break
          }
          case SIOInstructionTag.Modify: {
            const updated = nested.run(state)

            state  = updated[0]
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
      case SIOInstructionTag.EffectTotal: {
        result                = I.effect()
        const nextInstruction = popContinuation()
        if (nextInstruction) {
          current = nextInstruction.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case SIOInstructionTag.EffectPartial: {
        try {
          current = succeed(I.effect())
        } catch (e) {
          current = fail(I.onThrow(e))
        }
        break
      }
      case SIOInstructionTag.EffectSuspendTotal: {
        current = I.sio()
        break
      }
      case SIOInstructionTag.EffectSuspendPartial: {
        try {
          current = I.sio()
        } catch (e) {
          current = fail(I.onThrow(e))
        }
        break
      }
      case SIOInstructionTag.Succeed: {
        result          = I.value
        const nextInstr = popContinuation()
        if (nextInstr) {
          current = nextInstr.apply(result)
        } else {
          current = undefined
        }
        break
      }
      case SIOInstructionTag.Fail: {
        findNextErrorHandler()
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(I.e)
        } else {
          failed  = true
          result  = I.e
          current = undefined
        }
        break
      }
      case SIOInstructionTag.Fold: {
        current = I.sio
        pushContinuation(new FoldFrame(I.onFailure, I.onSuccess))
        break
      }
      case SIOInstructionTag.Asks: {
        current = I.f(environment)
        break
      }
      case SIOInstructionTag.Give: {
        environment = I.r
        current     = I.sio
        break
      }
      case SIOInstructionTag.Modify: {
        const updated  = I.run(state)
        state          = updated[0]
        result         = updated[1]
        const nextInst = popContinuation()
        if (nextInst) {
          current = nextInst.apply(result)
        } else {
          current = undefined
        }
        break
      }
    }
  }

  if (failed) {
    return E.left(result)
  }

  return E.right([state, result])
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runStateEither<S1>(s: S1): <S2, E, A>(fa: SIO<S1, S2, unknown, E, A>) => E.Either<E, readonly [S2, A]> {
  return (fa) => runStateEither_(fa, s)
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export function run_<S1, S2, A>(sio: SIO<S1, S2, unknown, never, A>, s: S1): readonly [S2, A] {
  return (runStateEither_(sio, s) as E.Right<readonly [S2, A]>).right
}

/**
 * Runs this computation with the specified initial state, returning both
 * updated state and the result
 */
export function run<S1>(s: S1): <S2, A>(sio: SIO<S1, S2, unknown, never, A>) => readonly [S2, A] {
  return (sio) => run_(sio, s)
}

/**
 * Runs this computation, returning the result.
 */
export function runIO<A>(sio: SIO<unknown, unknown, unknown, never, A>): A {
  return run_(sio, {})[1]
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export function runState_<S1, S2, A>(sio: SIO<S1, S2, unknown, never, A>, s: S1): S2 {
  return (runStateEither_(sio, s) as E.Right<readonly [S2, A]>).right[0]
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and discarding the result.
 */
export function runState<S1>(s: S1): <S2, A>(sio: SIO<S1, S2, unknown, never, A>) => S2 {
  return (sio) => runState_(sio, s)
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and the result.
 */
export function runStateResult_<S1, S2, A>(sio: SIO<S1, S2, unknown, never, A>, s: S1): readonly [S2, A] {
  return (runStateEither_(sio, s) as E.Right<readonly [S2, A]>).right
}

/**
 * Runs this computation with the specified initial state, returning the
 * updated state and the result.
 */
export function runStateResult<S1>(s: S1): <S2, A>(sio: SIO<S1, S2, unknown, never, A>) => readonly [S2, A] {
  return (sio) => runStateResult_(sio, s)
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runResult_<S1, S2, A>(sio: SIO<S1, S2, unknown, never, A>, s: S1): A {
  return (runStateEither_(sio, s) as E.Right<readonly [S2, A]>).right[1]
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runResult<S1>(s: S1): <S2, A>(sio: SIO<S1, S2, unknown, never, A>) => A {
  return (sio) => runResult_(sio, s)
}

/**
 * Runs this computation returning either the result or error
 */
export function runEither<E, A>(sio: SIO<never, unknown, unknown, E, A>): E.Either<E, A> {
  return E.map_(runStateEither_(sio, {} as never), ([_, x]) => x)
}

export function runEitherEnv_<R, E, A>(sio: SIO<never, unknown, R, E, A>, env: R): E.Either<E, A> {
  return runEither(giveAll_(sio, env))
}

export function runEitherEnv<R>(env: R): <E, A>(sio: SIO<never, unknown, R, E, A>) => E.Either<E, A> {
  return (sio) => runEitherEnv_(sio, env)
}

export const SIOtoIO = new AtomicReference<O.Option<<R, E, A>(_: SIO<unknown, never, R, E, A>) => I.IO<R, E, A>>>(
  O.none()
)
