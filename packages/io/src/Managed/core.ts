import type { Cause } from '../Cause'
import type { Exit } from '../Exit'
import type { FiberId } from '../Fiber/FiberId'
import type { Finalizer, ReleaseMap } from './ReleaseMap'
import type { Has, Tag } from '@principia/base/Has'
import type * as HKT from '@principia/base/HKT'
import type { Monoid } from '@principia/base/Monoid'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { _E, _R, EnforceNonEmptyRecord, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { _bind, _bindTo, flow, identity as identityFn, pipe, tuple } from '@principia/base/Function'
import { isTag } from '@principia/base/Has'
import * as Iter from '@principia/base/Iterable'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'

import * as C from '../Cause/core'
import * as Ex from '../Exit/core'
import * as Ref from '../IORef/core'
import * as I from './internal/io'
import { add, addIfOpen, noopFinalizer, release } from './ReleaseMap'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export const URI = 'Managed'

export type URI = typeof URI

export type V = HKT.V<'R', '-'> & HKT.V<'E', '+'>

export class Managed<R, E, A> {
  readonly [I._U]: URI;
  readonly [I._R]: (_: R) => void;
  readonly [I._E]: () => E;
  readonly [I._A]: () => A
  constructor(readonly io: I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>) {}
}

export type UManaged<A> = Managed<unknown, never, A>
export type URManaged<R, A> = Managed<R, never, A>
export type FManaged<E, A> = Managed<unknown, E, A>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Lift a pure value into an IO
 */
export function succeed<A>(a: A) {
  return fromEffect(I.pure(a))
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export function fromEffect<R, E, A>(effect: I.IO<R, E, A>) {
  return new Managed<R, E, A>(
    I.map_(
      I.asksM((_: readonly [R, ReleaseMap]) => I.giveAll_(effect, _[0])),
      (a) => [noopFinalizer, a]
    )
  )
}

export function fromEffectUninterruptible<R, E, A>(ma: I.IO<R, E, A>): Managed<R, E, A> {
  return fromEffect(I.makeUninterruptible(ma))
}

/**
 * Imports a synchronous side-effect into a Managed
 */
export function effectTotal<A>(effect: () => A): Managed<unknown, never, A> {
  return fromEffect(I.effectTotal(effect))
}

export function effect<A>(effect: () => A): Managed<unknown, unknown, A> {
  return fromEffect(I.effect(effect))
}

/**
 * Imports a synchronous side-effect that may throw into a Managed
 */
export function effectCatch_<E, A>(thunk: () => A, onThrow: (error: unknown) => E): Managed<unknown, E, A> {
  return fromEffect(I.effectCatch_(thunk, onThrow))
}

/**
 * Imports a synchronous side-effect that may throw into a Managed
 */
export function effectCatch<E>(onThrow: (error: unknown) => E): <A>(thunk: () => A) => Managed<unknown, E, A> {
  return (thunk) => effectCatch_(thunk, onThrow)
}

export function suspend<R, E, A>(managed: () => Managed<R, E, A>): Managed<R, E, A> {
  return flatten(effectTotal(managed))
}

/**
 * Returns a Managed that models failure with the specified error. The moral equivalent of throw for pure code.
 */
export function fail<E>(e: E): Managed<unknown, E, never> {
  return fromEffect(I.fail(e))
}

/**
 * Returns a Managed that models failure with the specified `Cause`.
 */
export function halt<E>(cause: Cause<E>): Managed<unknown, E, never> {
  return fromEffect(I.halt(cause))
}

/**
 * Returns a Managed that dies with the specified error
 */
export function die(e: Error): Managed<unknown, never, never> {
  return halt(C.die(e))
}

/**
 * Creates an effect that only executes the provided finalizer as its
 * release action.
 */
export function finalizer<R>(f: I.URIO<R, unknown>): Managed<R, never, void> {
  return finalizerExit((_) => f)
}

/**
 * Creates an effect that only executes the provided function as its
 * release action.
 */
export function finalizerExit<R>(f: (exit: Ex.Exit<unknown, unknown>) => I.URIO<R, unknown>): Managed<R, never, void> {
  return makeExit_(I.unit(), (_, exit) => f(exit))
}

/**
 * Creates an IO that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export function finalizerRef(initial: Finalizer) {
  return makeExit_(Ref.make(initial), (ref, exit) => I.chain_(ref.get, (f) => f(exit)))
}

/**
 * Returns the identity effectful function, which performs no effects
 */
export function identity<R>(): Managed<R, never, R> {
  return asks(identityFn)
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make<R1, A>(
  release: (a: A) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  return makeExit((a) => release(a))
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  return makeExit_(acquire, (a) => release(a))
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit<R1, A>(
  release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  return (acquire) => makeExit_(acquire, release)
}

/**
 * Lifts a `IO<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A, exit: Exit<any, any>) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  return new Managed<R & R1, E, A>(
    I.makeUninterruptible(
      I.gen(function* (_) {
        const r  = yield* _(I.ask<readonly [R & R1, ReleaseMap]>())
        const a  = yield* _(I.giveAll_(acquire, r[0]))
        const rm = yield* _(add((ex) => I.giveAll_(release(a, ex), r[0]))(r[1]))
        return tuple(rm, a)
      })
    )
  )
}

/**
 * Creates a `Managed` from a `Reservation` produced by an IO. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 */
export function makeReserve<R, E, R2, E2, A>(reservation: I.IO<R, E, Reservation<R2, E2, A>>) {
  return new Managed<R & R2, E | E2, A>(
    I.uninterruptibleMask(({ restore }) =>
      I.gen(function* (_) {
        const [r, releaseMap] = yield* _(I.ask<readonly [R & R2, ReleaseMap]>())
        const reserved        = yield* _(I.giveAll_(reservation, r))
        const releaseKey      = yield* _(addIfOpen((x) => I.giveAll_(reserved.release(x), r))(releaseMap))
        const finalizerAndA   = yield* _(
          I.effectSuspendTotal(() => {
            switch (releaseKey._tag) {
              case 'None': {
                return I.interrupt
              }
              case 'Some': {
                return pipe(
                  reserved.acquire,
                  I.gives(([r]: readonly [R & R2, ReleaseMap]) => r),
                  restore,
                  I.map((a): readonly [Finalizer, A] => tuple((e) => release(releaseKey.value, e)(releaseMap), a))
                )
              }
            }
          })
        )
        return finalizerAndA
      })
    )
  )
}

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 */
export class Reservation<R, E, A> {
  static of = <R, E, A, R2>(acquire: I.IO<R, E, A>, release: (exit: Exit<any, any>) => I.IO<R2, never, any>) =>
    new Reservation<R & R2, E, A>(acquire, release)

  private constructor(
    readonly acquire: I.IO<R, E, A>,
    readonly release: (exit: Exit<any, any>) => I.IO<R, never, any>
  ) {}
}

/**
 * Make a new reservation
 */
export function makeReservation_<R, E, A, R2>(
  acquire: I.IO<R, E, A>,
  release: (exit: Exit<any, any>) => I.IO<R2, never, any>
): Reservation<R & R2, E, A> {
  return Reservation.of(acquire, release)
}

/**
 * Make a new reservation
 */
export function makeReservation<R2>(
  release: (exit: Exit<any, any>) => I.IO<R2, never, any>
): <R, E, A>(acquire: I.IO<R, E, A>) => Reservation<R & R2, E, A> {
  return (acquire) => Reservation.of(acquire, release)
}

/**
 * Lifts a pure `Reservation<S, R, E, A>` into `Managed<S, R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export function reserve<R, E, A>(reservation: Reservation<R, E, A>): Managed<R, E, A> {
  return makeReserve(I.pure(reservation))
}

/**
 * Lifts an `Either` into a `ZManaged` value.
 */
export function fromEither<E, A>(ea: () => E.Either<E, A>): Managed<unknown, E, A> {
  return chain_(effectTotal(ea), E.fold(fail, succeed))
}

/**
 * Lifts a function `R => A` into a `Managed<R, never, A>`.
 */
export function fromFunction<R, A>(f: (r: R) => A): Managed<R, never, A> {
  return asks(f)
}

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 */
export function fromFunctionM<R0, R, E, A>(f: (r: R0) => I.IO<R, E, A>): Managed<R0 & R, E, A> {
  return asksM(f)
}

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 */
export function fromFunctionManaged<R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> {
  return asksManaged(f)
}

/*
 * -------------------------------------------
 * Sequential Applicative
 * -------------------------------------------
 */

export const pure = succeed

/*
 * -------------------------------------------
 * Sequential Apply Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function map2<A, R1, E1, B, C>(
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, C> {
  return (fa) => map2_(fa, fb, f)
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function map2_<R, E, A, R1, E1, B, C>(fa: Managed<R, E, A>, fb: Managed<R1, E1, B>, f: (a: A, b: B) => C) {
  return chain_(fa, (a) => map_(fb, (a2) => f(a, a2)))
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function product_<R, E, A, R1, E1, A1>(self: Managed<R, E, A>, that: Managed<R1, E1, A1>) {
  return map2_(self, that, (a, a2) => [a, a2] as [A, A1])
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function product<R1, E1, A1>(that: Managed<R1, E1, A1>) {
  return <R, E, A>(self: Managed<R, E, A>) => map2_(self, that, (a, a2) => [a, a2] as [A, A1])
}

export function ap_<R, E, A, Q, D, B>(fab: Managed<Q, D, (a: A) => B>, fa: Managed<R, E, A>): Managed<Q & R, D | E, B> {
  return map2_(fab, fa, (f, a) => f(a))
}

export function ap<R, E, A>(
  fa: Managed<R, E, A>
): <Q, D, B>(fab: Managed<Q, D, (a: A) => B>) => Managed<Q & R, E | D, B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<R, E, A, R1, E1, B>(fa: Managed<R, E, A>, fb: Managed<R1, E1, B>): Managed<R & R1, E | E1, A> {
  return map2_(fa, fb, (a, _) => a)
}

export function apFirst<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return map2_(fa, fb, (_, b) => b)
}

export function apSecond<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => apSecond_(fa, fb)
}

export const sequenceS = <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
  mr: EnforceNonEmptyRecord<MR> & Record<string, Managed<any, any, any>>
): Managed<
  _R<MR[keyof MR]>,
  _E<MR[keyof MR]>,
  {
    [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> =>
  map_(
    foreach_(
      R.collect_(mr, (k, v) => [k, v] as const),
      ([k, v]) => map_(v, (a) => [k, a] as const)
    ),
    (kvs) => {
      const mut_r = {}
      for (let i = 0; i < kvs.length; i++) {
        const [k, v] = kvs[i]
        mut_r[k]     = v
      }
      return mut_r
    }
  ) as any

export const sequenceT = <T extends ReadonlyArray<Managed<any, any, any>>>(
  ...mt: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, { [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never }> =>
  foreach_(mt, identityFn) as any

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, B, C>(pab: Managed<R, E, A>, f: (e: E) => B, g: (a: A) => C): Managed<R, B, C> {
  return new Managed(I.bimap_(pab.io, f, ([fin, a]) => [fin, g(a)]))
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, A, B, C>(f: (e: E) => B, g: (a: A) => C): <R>(pab: Managed<R, E, A>) => Managed<R, B, C> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 */
export function mapError_<R, E, A, D>(pab: Managed<R, E, A>, f: (e: E) => D): Managed<R, D, A> {
  return new Managed(I.mapError_(pab.io, f))
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 */
export function mapError<E, D>(f: (e: E) => D): <R, A>(pab: Managed<R, E, A>) => Managed<R, D, A> {
  return (pab) => mapError_(pab, f)
}

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause_<R, E, A, D>(ma: Managed<R, E, A>, f: (e: Cause<E>) => Cause<D>): Managed<R, D, A> {
  return new Managed(I.mapErrorCause_(ma.io, f))
}

/**
 * Returns a Managed whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause<E, D>(f: (e: Cause<E>) => Cause<D>): <R, A>(ma: Managed<R, E, A>) => Managed<R, D, A> {
  return (ma) => mapErrorCause_(ma, f)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

/**
 * Submerges the error case of an `Either` into the `Managed`. The inverse
 * operation of `Managed.either`.
 */
export const absolve: <R, E, E1, A>(fa: Managed<R, E, E.Either<E1, A>>) => Managed<R, E | E1, A> = chain((ea) =>
  fromEither(() => ea)
)

export const recover: <R, E, A>(fa: Managed<R, E, A>) => Managed<R, never, E.Either<E, A>> = fold(E.left, E.right)

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Managed<R & R1 & R2, E1 | E2, A1 | A2>(
    pipe(
      ma.io,
      I.foldCauseM(
        (c) => onFailure(c).io,
        ([_, a]) => onSuccess(a).io
      )
    )
  )
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => foldCauseM_(ma, onFailure, onSuccess)
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export function foldM_<R, E, A, R1, E1, B, R2, E2, C>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): Managed<R & R1 & R2, E1 | E2, B | C> {
  return foldCauseM_(ma, flow(C.failureOrCause, E.fold(f, halt)), g)
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export function foldM<E, A, R1, E1, B, R2, E2, C>(
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, B | C> {
  return (ma) => foldM_(ma, f, g)
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return foldM_(ma, flow(onError, succeed), flow(onSuccess, succeed))
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold<E, A, B, C>(
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => fold_(ma, onError, onSuccess)
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return fold_(sandbox(ma), onFailure, onSuccess)
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause<E, A, B, C>(
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => foldCause_(ma, onFailure, onSuccess)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function map_<R, E, A, B>(fa: Managed<R, E, A>, f: (a: A) => B): Managed<R, E, B> {
  return new Managed<R, E, B>(I.map_(fa.io, ([fin, a]) => [fin, f(a)]))
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Managed<R, E, A>) => Managed<R, E, B> {
  return (fa) => map_(fa, f)
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return new Managed<R & R1, E | E1, B>(
    I.chain_(fa.io, ([fin, a]) =>
      I.gives_(
        I.map_(f(a), (b) => [fin, b]),
        ([r]: readonly [R & R1, ReleaseMap]) => r
      )
    )
  )
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM<R1, E1, A, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => mapM_(fa, f)
}

/*
 * -------------------------------------------
 * Monad Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function chain<R1, E1, A, A1>(
  f: (a: A) => Managed<R1, E1, A1>
): <R, E>(self: Managed<R, E, A>) => Managed<R & R1, E1 | E, A1> {
  return (self) => chain_(self, f)
}

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function chain_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R1, E1, A1>
): Managed<R & R1, E | E1, A1> {
  return new Managed<R & R1, E | E1, A1>(
    I.chain_(self.io, ([releaseSelf, a]) =>
      I.map_(f(a).io, ([releaseThat, b]) => [
        (e) =>
          I.chain_(I.result(releaseThat(e)), (e1) =>
            I.chain_(I.result(releaseSelf(e1)), (e2) => I.done(Ex.apSecond_(e1, e2)))
          ),
        b
      ])
    )
  )
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap_<R, E, A, Q, D>(ma: Managed<R, E, A>, f: (a: A) => Managed<Q, D, any>): Managed<R & Q, E | D, A> {
  return chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap<R1, E1, A>(
  f: (a: A) => Managed<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => tap_(ma, f)
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export const flatten: <R, E, R1, E1, A>(mma: Managed<R, E, Managed<R1, E1, A>>) => Managed<R & R1, E | E1, A> = chain(
  identityFn
)

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export const flattenM: <R, E, R1, E1, A>(mma: Managed<R, E, I.IO<R1, E1, A>>) => Managed<R & R1, E | E1, A> = mapM(
  identityFn
)

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return foldM_(
    ma,
    (e) => chain_(f(e), () => fail(e)),
    (a) => map_(g(a), () => a)
  )
}

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 */
export function tapBoth<E, A, R1, E1, R2, E2>(
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E | E1 | E2, A> {
  return (ma) => tapBoth_(ma, f, g)
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 */
export function tapCause_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(ma, (c) => chain_(f(c), () => halt(c)))
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 */
export function tapCause<E, R1, E1>(
  f: (c: Cause<E>) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapCause_(ma, f)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 */
export function tapError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return tapBoth_(ma, f, succeed)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 */
export function tapError<E, R1, E1>(
  f: (e: E) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapError_(ma, f)
}

/**
 * Like `Managed#tap`, but uses a function that returns an `IO` value rather than a
 * `Managed` value.
 */
export function tapM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return mapM_(ma, (a) => I.as_(f(a), () => a))
}

/**
 * Like `Managed#tap`, but uses a function that returns an `IO` value rather than a
 * `Managed` value.
 */
export function tapM<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapM_(ma, f)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

/**
 * Accesses the whole environment of the effect.
 */
export function ask<R>(): Managed<R, never, R> {
  return fromEffect(I.ask<R>())
}

/**
 * Create a managed that accesses the environment.
 */
export function asks<R, A>(f: (r: R) => A): Managed<R, never, A> {
  return map_(ask<R>(), f)
}

/**
 * Create a managed that accesses the environment.
 */
export function asksM<R0, R, E, A>(f: (r: R0) => I.IO<R, E, A>): Managed<R0 & R, E, A> {
  return mapM_(ask<R0>(), f)
}

/**
 * Create a managed that accesses the environment.
 */
export function asksManaged<R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> {
  return chain_(ask<R0>(), f)
}

/**
 * Modify the environment required to run a Managed
 */
export function gives_<R, E, A, R0>(ma: Managed<R, E, A>, f: (r0: R0) => R): Managed<R0, E, A> {
  return new Managed(I.asksM(([r0, rm]: readonly [R0, ReleaseMap]) => I.giveAll_(ma.io, [f(r0), rm])))
}

/**
 * Modify the environment required to run a Managed
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: Managed<R, E, A>) => Managed<R0, E, A> {
  return (ma) => gives_(ma, f)
}

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, A>(ma: Managed<R, E, A>, env: R): Managed<unknown, E, A> {
  return gives_(ma, () => env)
}

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll<R>(env: R): <E, A>(ma: Managed<R, E, A>) => Managed<unknown, E, A> {
  return (ma) => giveAll_(ma, env)
}

export function give_<E, A, R = unknown, R0 = unknown>(ma: Managed<R & R0, E, A>, env: R): Managed<R0, E, A> {
  return gives_(ma, (r0) => ({ ...r0, ...env }))
}

export function give<R>(env: R): <R0, E, A>(ma: Managed<R & R0, E, A>) => Managed<R0, E, A> {
  return (ma) => give_(ma, env)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Managed<unknown, never, void> {
  return fromEffect(I.unit())
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 */
export function as_<R, E, A, B>(ma: Managed<R, E, A>, b: B): Managed<R, E, B> {
  return map_(ma, () => b)
}

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 */
export function as<B>(b: B): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, B> {
  return (ma) => as_(ma, b)
}

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, O.Option<A>> {
  return map_(ma, O.some)
}

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(ma: Managed<R, E, A>): Managed<R, O.Option<E>, A> {
  return mapError_(ma, O.some)
}

export const asUnit: <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> = map(() => undefined)

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return foldM_(ma, f, succeed)
}

/**
 * Recovers from all errors.
 */
export function catchAll<E, R1, E1, B>(
  f: (e: E) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAll_(ma, f)
}

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: Cause<E>) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return foldCauseM_(ma, f, succeed)
}

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause<E, R1, E1, B>(
  f: (e: Cause<E>) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAllCause_(ma, f)
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAll_(ma, (e) => O.getOrElse_(pf(e), () => fail<E | E1>(e)))
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome<E, R1, E1, B>(
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSome_(ma, pf)
}

/**
 * Recovers from some or all of the error Causes.
 */
export function catchSomeCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAllCause_(ma, (e) => O.getOrElse_(pf(e), () => halt<E | E1>(e)))
}

/**
 * Recovers from some or all of the error Causes.
 */
export function catchSomeCause<E, R1, E1, B>(
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSomeCause_(ma, pf)
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * continue with the returned value.
 */
export function collectM_<R, E, A, E1, R2, E2, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): Managed<R & R2, E | E1 | E2, B> {
  return chain_(ma, (a) => O.getOrElse_(pf(a), () => fail<E1 | E2>(e)))
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * continue with the returned value.
 */
export function collectM<A, E1, R2, E2, B>(
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R2, E1 | E | E2, B> {
  return (ma) => collectM_(ma, e, pf)
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 */
export function collect_<R, E, A, E1, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<B>
): Managed<R, E | E1, B> {
  return collectM_(ma, e, flow(pf, O.map(succeed)))
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 */
export function collect<A, E1, B>(
  e: E1,
  pf: (a: A) => O.Option<B>
): <R, E>(ma: Managed<R, E, A>) => Managed<R, E1 | E, B> {
  return (ma) => collect_(ma, e, pf)
}

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAll<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, ReadonlyArray<A>> {
  return foreach_(mas, identityFn)
}

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllPar_`.
 */
export function collectAllUnit<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, void> {
  return foreachUnit_(mas, identityFn)
}

/**
 * Executes the second effect and then provides its output as an environment to this effect
 */
export function compose<R, E, A, R1, E1>(ma: Managed<R, E, A>, that: Managed<R1, E1, R>): Managed<R1, E | E1, A> {
  return pipe(
    ask<R1>(),
    chain((r1) => give_(that, r1)),
    chain((r) => give_(ma, r))
  )
}

/**
 * Returns a Managed that ignores errors raised by the acquire effect and
 * runs it repeatedly until it eventually succeeds.
 */
export function eventually<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  return new Managed(I.eventually(ma.io))
}

/**
 * Effectfully map the error channel
 */
export function chainError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => URManaged<R1, E1>
): Managed<R & R1, E1, A> {
  return swapWith_(ma, chain(f))
}

/**
 * Effectfully map the error channel
 */
export function chainError<E, R1, E1>(
  f: (e: E) => URManaged<R1, E1>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A> {
  return (ma) => chainError_(ma, f)
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldLeft_<R, E, A, B>(as: Iterable<A>, b: B, f: (b: B, a: A) => Managed<R, E, B>): Managed<R, E, B> {
  return A.foldLeft_(Array.from(as), succeed(b) as Managed<R, E, B>, (acc, v) => chain_(acc, (a) => f(a, v)))
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldLeft<R, E, A, B>(b: B, f: (b: B, a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, B> {
  return (as) => foldLeft_(as, b, f)
}

/**
 * Combines an array of `Managed` effects using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap_<M>(
  M: Monoid<M>
): <R, E, A>(mas: Iterable<Managed<R, E, A>>, f: (a: A) => M) => Managed<R, E, M> {
  return (mas, f) => foldLeft_(mas, M.nat, (x, ma) => pipe(ma, map(flow(f, (y) => M.combine_(x, y)))))
}

/**
 * Combines an array of `Managed` effects using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap<M>(
  M: Monoid<M>
): <A>(f: (a: A) => M) => <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, M> {
  return (f) => (mas) => foldMap_(M)(mas, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export function foreach<R, E, A, B>(f: (a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, readonly B[]> {
  return (as) => foreach_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 */
export function foreach_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>) {
  return new Managed<R, E, readonly B[]>(
    I.map_(
      I.foreach_(as, (a) => f(a).io),
      (res) => {
        const fins = res.map((k) => k[0])
        const as   = res.map((k) => k[1])

        return [(e) => I.foreach_(fins.reverse(), (fin) => fin(e)), as]
      }
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 */
export function foreachUnit_<R, E, A>(as: Iterable<A>, f: (a: A) => Managed<R, E, unknown>): Managed<R, E, void> {
  return new Managed(
    pipe(
      as,
      I.foreach((a) => f(a).io),
      I.map((result) => {
        const fins = A.map_(result, (k) => k[0])

        return [(e) => I.foreach_(A.reverse(fins), (fin) => fin(e)), undefined]
      })
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 */
export function foreachUnit<R, E, A>(f: (a: A) => Managed<R, E, unknown>): (as: Iterable<A>) => Managed<R, E, void> {
  return (as) => foreachUnit_(as, f)
}

/**
 * Unwraps the optional success of this effect, but can fail with None value.
 */
export function get<R, A>(ma: Managed<R, never, O.Option<A>>): Managed<R, O.Option<never>, A> {
  return absolve(
    map_(
      ma,
      E.fromOption(() => O.none())
    )
  )
}
/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export function ifM_<R, E, R1, E1, B, R2, E2, C>(
  mb: Managed<R, E, boolean>,
  onTrue: () => Managed<R1, E1, B>,
  onFalse: () => Managed<R2, E2, C>
): Managed<R & R1 & R2, E | E1 | E2, B | C> {
  return chain_(mb, (b) => (b ? (onTrue() as Managed<R & R1 & R2, E | E1 | E2, B | C>) : onFalse()))
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export function ifM<R1, E1, B, R2, E2, C>(onTrue: () => Managed<R1, E1, B>, onFalse: () => Managed<R2, E2, C>) {
  return <R, E>(mb: Managed<R, E, boolean>): Managed<R & R1 & R2, E | E1 | E2, B | C> => ifM_(mb, onTrue, onFalse)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export function if_<R, E, A, R1, E1, B>(
  b: boolean,
  onTrue: () => Managed<R, E, A>,
  onFalse: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return ifM_(succeed(b), onTrue, onFalse)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
function _if<R, E, A, R1, E1, B>(onTrue: () => Managed<R, E, A>, onFalse: () => Managed<R1, E1, B>) {
  return (b: boolean): Managed<R & R1, E | E1, A | B> => if_(b, onTrue, onFalse)
}
export { _if as if }

/**
 * Ignores the success or failure of a Managed
 */
export function ignore<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, void> {
  return fold_(
    ma,
    () => {
      /* */
    },
    () => {
      /* */
    }
  )
}

/**
 * Returns a Managed that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt: Managed<unknown, never, never> = chain_(
  fromEffect(I.descriptorWith((d) => I.succeed(d.id))),
  (id) => halt(C.interrupt(id))
)

/**
 * Returns a Managed that is interrupted as if by the specified fiber.
 */
export function interruptAs(fiberId: FiberId): Managed<unknown, never, never> {
  return halt(C.interrupt(fiberId))
}

/**
 * Returns whether this managed effect is a failure.
 */
export function isFailure<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> {
  return fold_(
    ma,
    () => true,
    () => false
  )
}

/**
 * Returns whether this managed effect is a success.
 */
export function isSuccess<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> {
  return fold_(
    ma,
    () => false,
    () => true
  )
}

/**
 * Depending on the environment execute this or the other effect
 */
export function join_<R, E, A, R1, E1, A1>(
  ma: Managed<R, E, A>,
  that: Managed<R1, E1, A1>
): Managed<E.Either<R, R1>, E | E1, A | A1> {
  return chain_(
    ask<E.Either<R, R1>>(),
    E.fold(
      (r): FManaged<E | E1, A | A1> => giveAll_(ma, r),
      (r1) => giveAll_(that, r1)
    )
  )
}

/**
 * Depending on the environment execute this or the other effect
 */
export function join<R1, E1, A1>(
  that: Managed<R1, E1, A1>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<E.Either<R, R1>, E1 | E, A1 | A> {
  return (ma) => join_(ma, that)
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R1, E1, A1>(
  ma: Managed<R, E, A>,
  that: Managed<R1, E1, A1>
): Managed<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  return chain_(
    ask<E.Either<R, R1>>(),
    E.fold(
      (r): FManaged<E | E1, E.Either<A, A1>> => giveAll_(map_(ma, E.left), r),
      (r1) => giveAll_(map_(that, E.right), r1)
    )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither<R1, E1, A1>(
  that: Managed<R1, E1, A1>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<E.Either<R, R1>, E1 | E, E.Either<A, A1>> {
  return (ma) => joinEither_(ma, that)
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffectWith_<R, E, A, E1, B>(
  ma: Managed<R, E, A>,
  f: (a: A) => B,
  onThrow: (error: unknown) => E1
): Managed<R, E | E1, B> {
  return foldM_(ma, fail, (a) => effectCatch_(() => f(a), onThrow))
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffectWith<A, E1, B>(
  f: (a: A) => B,
  onThrow: (error: unknown) => E1
): <R, E>(ma: Managed<R, E, A>) => Managed<R, E | E1, B> {
  return (ma) => mapEffectWith_(ma, f, onThrow)
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function.
 */
export function mapEffect_<R, E, A, B>(ma: Managed<R, E, A>, f: (a: A) => B): Managed<R, unknown, B> {
  return mapEffectWith_(ma, f, identityFn)
}

/**
 * Returns a Managed whose success is mapped by the specified side effecting
 * `f` function.
 */
export function mapEffect<A, B>(f: (a: A) => B): <R, E>(ma: Managed<R, E, A>) => Managed<R, unknown, B> {
  return (ma) => mapEffect_(ma, f)
}

/**
 * Returns a new Managed where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, E | A> {
  return foldM_(ma, succeed, succeed)
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 */
export function mergeAll_<R, E, A, B>(mas: Iterable<Managed<R, E, A>>, b: B, f: (b: B, a: A) => B): Managed<R, E, B> {
  return Iter.foldLeft_(mas, succeed(b) as Managed<R, E, B>, (b, a) => map2_(b, a, f))
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 */
export function mergeAll<A, B>(
  b: B,
  f: (b: B, a: A) => B
): <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
  return (mas) => mergeAll_(mas, b, f)
}

/**
 * Requires the option produced by this value to be `None`.
 */
export function none<R, E, A>(ma: Managed<R, E, O.Option<A>>): Managed<R, O.Option<E>, void> {
  return foldM_(
    ma,
    flow(O.some, fail),
    O.fold(
      () => unit(),
      () => fail(O.none())
    )
  )
}

/**
 * Executes this effect, skipping the error but returning optionally the success.
 */
export function option<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, O.Option<A>> {
  return fold_(ma, () => O.none(), O.some)
}

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(ma: Managed<R, O.Option<E>, A>): Managed<R, E, O.Option<A>> {
  return foldM_(
    ma,
    O.fold(() => succeed(O.none()), fail),
    flow(O.some, succeed)
  )
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into an unknown`.
 */
export function orDieWith_<R, E, A>(ma: Managed<R, E, A>, f: (e: E) => Error): Managed<R, never, A> {
  return new Managed(I.orDieWith_(ma.io, f))
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into an unknown.
 */
export function orDieWith<E>(f: (e: E) => Error): <R, A>(ma: Managed<R, E, A>) => Managed<R, never, A> {
  return (ma) => orDieWith_(ma, f)
}

/**
 * Translates effect failure into death of the fiber, making all failures unchecked and
 * not a part of the type of the effect.
 */
export function orDie<R, E extends Error, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  return orDieWith_(ma, identityFn)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return foldM_(ma, () => that(), succeed)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => orElse_(ma, that)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 */
export function orElseEither_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E1, E.Either<B, A>> {
  return foldM_(ma, () => map_(that(), E.left), flow(E.right, succeed))
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 */
export function orElseEither<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, E.Either<B, A>> {
  return (ma) => orElseEither_(ma, that)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail_<R, E, A, E1>(ma: Managed<R, E, A>, e: E1): Managed<R, E | E1, A> {
  return orElse_(ma, () => fail(e))
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail<E1>(e: E1): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E1 | E, A> {
  return (ma) => orElseFail_(ma, e)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional_<R, E, A, R1, E1, B>(
  ma: Managed<R, O.Option<E>, A>,
  that: () => Managed<R1, O.Option<E1>, B>
): Managed<R & R1, O.Option<E | E1>, A | B> {
  return catchAll_(
    ma,
    O.fold(
      () => that(),
      (e) => fail(O.some<E | E1>(e))
    )
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional<R1, E1, B>(
  that: () => Managed<R1, O.Option<E1>, B>
): <R, E, A>(ma: Managed<R, O.Option<E>, A>) => Managed<R & R1, O.Option<E | E1>, A | B> {
  return (ma) => orElseOptional_(ma, that)
}

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<R, E, A, A1>(ma: Managed<R, E, A>, that: () => A1): Managed<R, E, A | A1> {
  return orElse_(ma, () => succeed(that()))
}

/**
 * Executes this Managed and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed<A1>(that: () => A1): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, A1 | A> {
  return (ma) => orElseSucceed_(ma, that)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, A, E1>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => Error
): Managed<R, E1, A> {
  return catchAll_(ma, (e) => O.fold_(pf(e), () => die(f(e)), fail))
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => Error
): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
  return (ma) => refineOrDieWith_(ma, pf, f)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E extends Error, A, E1>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>
): Managed<R, E1, A> {
  return refineOrDieWith_(ma, pf, identityFn)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E extends Error, E1>(
  pf: (e: E) => O.Option<E1>
): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
  return (ma) => refineOrDie_(ma, pf)
}

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>
): Managed<R & R1, E | E1, A> {
  return chain_(ma, (a) => O.fold_(pf(a), () => succeed(a), chain(fail)))
}

/**
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM<A, R1, E1>(
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => rejectM_(ma, pf)
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with our held value.
 */
export function reject_<R, E, A, E1>(ma: Managed<R, E, A>, pf: (a: A) => O.Option<E1>): Managed<R, E | E1, A> {
  return rejectM_(ma, (a) => O.map_(pf(a), fail))
}

/**
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with our held value.
 */
export function reject<A, E1>(pf: (a: A) => O.Option<E1>): <R, E>(ma: Managed<R, E, A>) => Managed<R, E1 | E, A> {
  return (ma) => reject_(ma, pf)
}

export function require_<R, E, A>(ma: Managed<R, E, O.Option<A>>, error: () => E): Managed<R, E, A> {
  return chain_(
    ma,
    O.fold(() => chain_(effectTotal(error), fail), succeed)
  )
}

function _require<E>(error: () => E): <R, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A> {
  return (ma) => require_(ma, error)
}
export { _require as require }

/**
 * Returns a Managed that semantically runs the Managed on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 */
export function result<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, Ex.Exit<E, A>> {
  return foldCauseM_(
    ma,
    (cause) => succeed(Ex.halt(cause)),
    (a) => succeed(Ex.succeed(a))
  )
}

/**
 * Extracts the optional value, or returns the given 'default'.
 */
export function someOrElse_<R, E, A, B>(ma: Managed<R, E, O.Option<A>>, onNone: () => B): Managed<R, E, A | B> {
  return map_(ma, O.getOrElse(onNone))
}

/**
 * Extracts the optional value, or returns the given 'default'.
 */
export function someOrElse<B>(onNone: () => B): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A | B> {
  return (ma) => someOrElse_(ma, onNone)
}

/**
 * Extracts the optional value, or executes the effect 'default'.
 */
export function someOrElseM_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, O.Option<A>>,
  onNone: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return chain_(
    ma,
    O.fold((): Managed<R1, E1, A | B> => onNone, succeed)
  )
}

/**
 * Extracts the optional value, or executes the effect 'default'.
 */
export function someOrElseM<R1, E1, B>(
  onNone: Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => someOrElseM_(ma, onNone)
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFailWith_<R, E, A, E1>(ma: Managed<R, E, O.Option<A>>, e: () => E1): Managed<R, E | E1, A> {
  return chain_(
    ma,
    O.fold(() => fail(e()), succeed)
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFailWith<E1>(e: () => E1): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E | E1, A> {
  return (ma) => someOrFailWith_(ma, e)
}

/**
 * Extracts the optional value, or fails with a NoSuchElementException
 */
export function someOrFail<R, E, A>(ma: Managed<R, E, O.Option<A>>): Managed<R, E | NoSuchElementException, A> {
  return someOrFailWith_(ma, () => new NoSuchElementException('Managed.someOrFail'))
}

/**
 * Swaps the error and result
 */
export function swap<R, E, A>(ma: Managed<R, E, A>): Managed<R, A, E> {
  return foldM_(ma, succeed, fail)
}

/**
 * Swap the error and result, then apply an effectful function to the effect
 */
export function swapWith_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (me: Managed<R, A, E>) => Managed<R1, B, E1>
): Managed<R1, E1, B> {
  return swap(f(swap(ma)))
}

/**
 * Swap the error and result, then apply an effectful function to the effect
 */
export function swapWith<R, E, A, R1, E1, B>(
  f: (me: Managed<R, A, E>) => Managed<R1, B, E1>
): (ma: Managed<R, E, A>) => Managed<R1, E1, B> {
  return (ma) => swapWith_(ma, f)
}

/**
 * Exposes the full cause of failure of this Managed.
 */
export function sandbox<R, E, A>(ma: Managed<R, E, A>): Managed<R, Cause<E>, A> {
  return new Managed(I.sandbox(ma.io))
}

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (ma: Managed<R, Cause<E>, A>) => Managed<R1, Cause<E1>, B>
): Managed<R & R1, E | E1, B> {
  return unsandbox(f(sandbox(ma)))
}

/**
 * The moral equivalent of `if (!p) exp`
 */
export function unless_<R, E, A>(ma: Managed<R, E, A>, b: () => boolean): Managed<R, E, void> {
  return suspend(() => (b() ? unit() : asUnit(ma)))
}

/**
 * The moral equivalent of `if (!p) exp`
 */
export function unless(b: () => boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
  return (ma) => unless_(ma, b)
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export function unlessM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> {
  return chain_(mb, (b) => (b ? unit() : asUnit(ma)))
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export function unlessM<R1, E1>(
  mb: Managed<R1, E1, boolean>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, void> {
  return (ma) => unlessM_(ma, mb)
}

/**
 * The inverse operation of `sandbox`
 */
export const unsandbox: <R, E, A>(ma: Managed<R, Cause<E>, A>) => Managed<R, E, A> = mapErrorCause(C.flatten)

/**
 * Unwraps a `Managed` that is inside an `IO`.
 */
export function unwrap<R, E, R1, E1, A>(fa: I.IO<R, E, Managed<R1, E1, A>>): Managed<R & R1, E | E1, A> {
  return flatten(fromEffect(fa))
}

/**
 * The moral equivalent of `if (p) exp`
 */
export function when_<R, E, A>(ma: Managed<R, E, A>, b: boolean): Managed<R, E, void> {
  return suspend(() => (b ? asUnit(ma) : unit()))
}

/**
 * The moral equivalent of `if (p) exp`
 */
export function when(b: boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
  return (ma) => when_(ma, b)
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> {
  return chain_(mb, (b) => (b ? asUnit(ma) : unit()))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM<R1, E1>(
  mb: Managed<R1, E1, boolean>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, void> {
  return (ma) => whenM_(ma, mb)
}

/**
 * Zips this Managed with its environment
 */
export function zipEnv<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [A, R]> {
  return product_(ma, ask<R>())
}

/*
 * -------------------------------------------
 * Service
 * -------------------------------------------
 */

export function askService<T>(t: Tag<T>): Managed<Has<T>, never, T> {
  return asks(t.read)
}

export function asksService<T>(t: Tag<T>): <A>(f: (a: T) => A) => Managed<Has<T>, never, A> {
  return (f) => asks(flow(t.read, f))
}

export function asksServiceM<T>(t: Tag<T>): <R, E, A>(f: (a: T) => I.IO<R, E, A>) => Managed<Has<T> & R, E, A> {
  return (f) => asksM(flow(t.read, f))
}

export function asksServiceManaged<T>(
  t: Tag<T>
): <R, E, A>(f: (a: T) => Managed<R, E, A>) => Managed<Has<T> & R, E, A> {
  return (f) => asksManaged(flow(t.read, f))
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => I.IO<R, E, B>
) => Managed<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]> & R,
  E,
  B
> {
  return (f) =>
    asksM((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesManaged<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Managed<R, E, B>
) => Managed<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]> & R,
  E,
  B
> {
  return (f) =>
    asksManaged(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export function asksServicesTM<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => I.IO<R, E, B>
) => Managed<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]> & R,
  E,
  B
> {
  return (f) =>
    asksM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

export function asksServicesTManaged<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Managed<R, E, B>
) => Managed<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]> & R,
  E,
  B
> {
  return (f) =>
    asksManaged(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

export function asksServicesT<SS extends Tag<any>[]>(
  ...s: SS
): <B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Managed<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  never,
  B
> {
  return (f) =>
    asks(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServices<SS extends Record<string, Tag<any>>>(
  s: SS
): <B>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Managed<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  never,
  B
> {
  return (f) =>
    asks((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * ```haskell
 * asService :: Tag a -> Managed r e a -> Managed r e (Has a)
 * ```
 *
 * Maps the success value of this Managed to a service.
 */
export function asService<A>(tag: Tag<A>): <R, E>(ma: Managed<R, E, A>) => Managed<R, E, Has<A>> {
  return (ma) => map_(ma, tag.of)
}

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

const of = succeed({})
export { of as do }

export function bindS<R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>
): <R2, E2>(
  mk: Managed<R2, E2, K>
) => Managed<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> {
  return chain((a) =>
    pipe(
      f(a),
      map((b) => _bind(a, name, b))
    )
  )
}

export function bindTo<K, N extends string>(
  name: Exclude<N, keyof K>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R, E, { [k in Exclude<N, keyof K>]: A }> {
  return (fa) => map_(fa, _bindTo(name))
}

export function letS<K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
): <R2, E2>(mk: Managed<R2, E2, K>) => Managed<R2, E2, { [k in N | keyof K]: k extends keyof K ? K[k] : A }> {
  return bindS(name, flow(f, succeed))
}

/*
 * -------------------------------------------
 * Gen
 * -------------------------------------------
 */

export class GenManaged<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly M: Managed<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenManaged<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenManaged(asksService(_)(identityFn))
  }
  if (E.isEither(_)) {
    return new GenManaged(fromEither(() => _))
  }
  if (O.isOption(_)) {
    return new GenManaged(__ ? (_._tag === 'None' ? fail(__()) : succeed(_.value)) : fromEffect(I.getOrFail(() => _)))
  }
  if (_ instanceof Managed) {
    return new GenManaged(_)
  }
  return new GenManaged(fromEffect(_))
}

export function gen<R0, E0, A0>(): <T extends GenManaged<R0, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: O.Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: I.IO<R, E, A>): GenManaged<R, E, A>
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>
export function gen<E0, A0>(): <T extends GenManaged<any, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: O.Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: I.IO<R, E, A>): GenManaged<R, E, A>
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>
export function gen<A0>(): <T extends GenManaged<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: O.Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: I.IO<R, E, A>): GenManaged<R, E, A>
  }) => Generator<T, A0, any>
) => Managed<_R<T>, _E<T>, A0>
export function gen<T extends GenManaged<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenManaged<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenManaged<unknown, E, A>
    <A>(_: O.Option<A>): GenManaged<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenManaged<unknown, E, A>
    <R, E, A>(_: Managed<R, E, A>): GenManaged<R, E, A>
    <R, E, A>(_: I.IO<R, E, A>): GenManaged<R, E, A>
  }) => Generator<T, AEff, any>
): Managed<_R<T>, _E<T>, AEff>
export function gen(...args: any[]): any {
  function gen_<Eff extends GenManaged<any, any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): Managed<_R<Eff>, _E<Eff>, AEff> {
    return suspend(() => {
      const iterator = f(adapter as any)
      const state    = iterator.next()

      function run(state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>): Managed<any, any, AEff> {
        if (state.done) {
          return succeed(state.value)
        }
        return chain_(state.value.M, (val) => {
          const next = iterator.next(val)
          return run(next)
        })
      }

      return run(state)
    })
  }

  if (args.length === 0) {
    return (f: any) => gen_(f)
  }
  return gen_(args[0])
}
