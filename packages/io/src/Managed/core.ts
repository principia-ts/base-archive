import type { Cause } from '../Cause'
import type { Exit } from '../Exit'
import type { FiberId } from '../Fiber/FiberId'
import type { Finalizer, ReleaseMap } from './ReleaseMap'
import type { Has, Tag } from '@principia/base/Has'
import type { ReadonlyRecord } from '@principia/base/Record'
import type * as HKT from '@principia/base/HKT'
import type { _E, _R, EnforceNonEmptyRecord , UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { _bind, _bindTo, flow, identity, pipe } from '@principia/base/Function'
import { isTag } from '@principia/base/Has'
import * as Iter from '@principia/base/Iterable'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'

import * as C from '../Cause/core'
import * as Ex from '../Exit/core'
import * as Ref from '../IORef/core'
import * as I from './_internal/io'
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
export function die(error: unknown): Managed<unknown, never, never> {
  return halt(C.die(error))
}

/**
 * Creates an IO that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export function finalizerRef(initial: Finalizer) {
  return makeExit_(Ref.make(initial), (ref, exit) => I.flatMap_(ref.get, (f) => f(exit)))
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
      pipe(
        I.do,
        I.bindS('r', () => I.ask<readonly [R & R1, ReleaseMap]>()),
        I.bindS('a', (s) => I.giveAll_(acquire, s.r[0])),
        I.bindS('rm', (s) => add((ex) => I.giveAll_(release(s.a, ex), s.r[0]))(s.r[1])),
        I.map((s) => [s.rm, s.a])
      )
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
      pipe(
        I.do,
        I.bindS('tp', () => I.ask<readonly [R & R2, ReleaseMap]>()),
        I.letS('r', (s) => s.tp[0]),
        I.letS('releaseMap', (s) => s.tp[1]),
        I.bindS('reserved', (s) => I.giveAll_(reservation, s.r)),
        I.bindS('releaseKey', (s) => addIfOpen((x) => I.giveAll_(s.reserved.release(x), s.r))(s.releaseMap)),
        I.bindS('finalizerAndA', (s) => {
          const k = s.releaseKey
          switch (k._tag) {
            case 'None': {
              return I.interrupt
            }
            case 'Some': {
              return I.map_(restore(I.gives_(s.reserved.acquire, ([r]: readonly [R & R2, ReleaseMap]) => r)), (a): [
                Finalizer,
                A
              ] => [(e) => release(k.value, e)(s.releaseMap), a])
            }
          }
        }),
        I.map((s) => s.finalizerAndA)
      )
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
  return flatMap_(effectTotal(ea), E.fold(fail, succeed))
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
export function fromFunctionM<R, E, A>(f: (r: R) => I.IO<unknown, E, A>): Managed<R, E, A> {
  return asksM(f)
}

/**
 * Lifts an effectful function whose effect requires no environment into
 * an effect that requires the input to the function.
 */
export function fromFunctionManaged<R, E, A>(f: (r: R) => Managed<unknown, E, A>): Managed<R, E, A> {
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
  return flatMap_(fa, (a) => map_(fb, (a2) => f(a, a2)))
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

export const struct = <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
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

export const tuple = <T extends ReadonlyArray<Managed<any, any, any>>>(
  ...mt: T & {
    0: Managed<any, any, any>
  }
): Managed<_R<T[number]>, _E<T[number]>, { [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never }> =>
  foreach_(mt, identity) as any

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<R, E, A, B, C>(pab: Managed<R, E, A>, f: (e: E) => B, g: (a: A) => C): Managed<R, B, C> {
  return new Managed(I.bimap_(pab.io, f, ([fin, a]) => [fin, g(a)]))
}

export function bimap<E, A, B, C>(f: (e: E) => B, g: (a: A) => C): <R>(pab: Managed<R, E, A>) => Managed<R, B, C> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<R, E, A, D>(pab: Managed<R, E, A>, f: (e: E) => D): Managed<R, D, A> {
  return new Managed(I.mapError_(pab.io, f))
}

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
export const absolve: <R, E, E1, A>(fa: Managed<R, E, E.Either<E1, A>>) => Managed<R, E | E1, A> = flatMap((ea) =>
  fromEither(() => ea)
)

export const recover: <R, E, A>(fa: Managed<R, E, A>) => Managed<R, never, E.Either<E, A>> = fold(
  E.left,
  E.right
)

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

export function fold_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return foldM_(ma, flow(onError, succeed), flow(onSuccess, succeed))
}

export function fold<E, A, B, C>(
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => fold_(ma, onError, onSuccess)
}

export function foldCause_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return fold_(sandbox(ma), onFailure, onSuccess)
}

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
    I.flatMap_(fa.io, ([fin, a]) =>
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
export function flatMap<R1, E1, A, A1>(
  f: (a: A) => Managed<R1, E1, A1>
): <R, E>(self: Managed<R, E, A>) => Managed<R & R1, E1 | E, A1> {
  return (self) => flatMap_(self, f)
}

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function flatMap_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R1, E1, A1>
): Managed<R & R1, E | E1, A1> {
  return new Managed<R & R1, E | E1, A1>(
    I.flatMap_(self.io, ([releaseSelf, a]) =>
      I.map_(f(a).io, ([releaseThat, b]) => [
        (e) =>
          I.flatMap_(I.result(releaseThat(e)), (e1) =>
            I.flatMap_(I.result(releaseSelf(e1)), (e2) => I.done(Ex.apSecond_(e1, e2)))
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
  return flatMap_(ma, (a) => map_(f(a), () => a))
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap<R1, E1, A>(
  f: (a: A) => Managed<R1, E1, any>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (ma) => tap_(ma, f)
}

export const flatten: <R, E, R1, E1, A>(mma: Managed<R, E, Managed<R1, E1, A>>) => Managed<R & R1, E | E1, A> = flatMap(
  identity
)

export const flattenM: <R, E, R1, E1, A>(mma: Managed<R, E, I.IO<R1, E1, A>>) => Managed<R & R1, E | E1, A> = mapM(
  identity
)

export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return foldM_(
    ma,
    (e) => flatMap_(f(e), () => fail(e)),
    (a) => map_(g(a), () => a)
  )
}

export function tapBoth<E, A, R1, E1, R2, E2>(
  f: (e: E) => Managed<R1, E1, any>,
  g: (a: A) => Managed<R2, E2, any>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E | E1 | E2, A> {
  return (ma) => tapBoth_(ma, f, g)
}

export function tapCause_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(ma, (c) => flatMap_(f(c), () => halt(c)))
}

export function tapCause<E, R1, E1>(
  f: (c: Cause<E>) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapCause_(ma, f)
}

export function tapError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return tapBoth_(ma, f, succeed)
}

export function tapError<E, R1, E1>(
  f: (e: E) => Managed<R1, E1, any>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A> {
  return (ma) => tapError_(ma, f)
}

export function tapM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, any>
): Managed<R & R1, E | E1, A> {
  return mapM_(ma, (a) => I.as_(f(a), () => a))
}

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

export function ask<R>(): Managed<R, never, R> {
  return fromEffect(I.ask<R>())
}

export function asks<R, A>(f: (r: R) => A): Managed<R, never, A> {
  return map_(ask<R>(), f)
}

export function asksM<R0, R, E, A>(f: (r: R0) => I.IO<R, E, A>): Managed<R0 & R, E, A> {
  return mapM_(ask<R0>(), f)
}

export function asksManaged<R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> {
  return flatMap_(ask<R0>(), f)
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

export function giveAll_<R, E, A>(ma: Managed<R, E, A>, env: R): Managed<unknown, E, A> {
  return gives_(ma, () => env)
}

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

export function as_<R, E, A, B>(ma: Managed<R, E, A>, b: B): Managed<R, E, B> {
  return map_(ma, () => b)
}

export function as<B>(b: B): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, B> {
  return (ma) => as_(ma, b)
}

export function asSome<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, O.Option<A>> {
  return map_(ma, O.some)
}

export function asSomeError<R, E, A>(ma: Managed<R, E, A>): Managed<R, O.Option<E>, A> {
  return mapError_(ma, O.some)
}

export const asUnit: <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> = map(() => undefined)

export function catchAll_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return foldM_(ma, f, succeed)
}

export function catchAll<E, R1, E1, B>(
  f: (e: E) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAll_(ma, f)
}

export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (e: Cause<E>) => Managed<R1, E1, B>
): Managed<R & R1, E1, A | B> {
  return foldCauseM_(ma, f, succeed)
}

export function catchAllCause<E, R1, E1, B>(
  f: (e: Cause<E>) => Managed<R1, E1, B>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A | B> {
  return (ma) => catchAllCause_(ma, f)
}

export function catchSome_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAll_(ma, (e) => O.getOrElse_(pf(e), () => fail<E | E1>(e)))
}

export function catchSome<E, R1, E1, B>(
  pf: (e: E) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSome_(ma, pf)
}

export function catchSomeCause_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): Managed<R & R1, E | E1, A | B> {
  return catchAllCause_(ma, (e) => O.getOrElse_(pf(e), () => halt<E | E1>(e)))
}

export function catchSomeCause<E, R1, E1, B>(
  pf: (e: Cause<E>) => O.Option<Managed<R1, E1, B>>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => catchSomeCause_(ma, pf)
}

/**
 * Effectfully map the error channel
 */
export function chainError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => URManaged<R1, E1>
): Managed<R & R1, E1, A> {
  return swapWith_(ma, flatMap(f))
}

/**
 * Effectfully map the error channel
 */
export function chainError<E, R1, E1>(
  f: (e: E) => URManaged<R1, E1>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A> {
  return (ma) => chainError_(ma, f)
}

export function collectM_<R, E, A, E1, R2, E2, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): Managed<R & R2, E | E1 | E2, B> {
  return flatMap_(ma, (a) => O.getOrElse_(pf(a), () => fail<E1 | E2>(e)))
}

export function collectM<A, E1, R2, E2, B>(
  e: E1,
  pf: (a: A) => O.Option<Managed<R2, E2, B>>
): <R, E>(ma: Managed<R, E, A>) => Managed<R & R2, E1 | E | E2, B> {
  return (ma) => collectM_(ma, e, pf)
}

export function collect_<R, E, A, E1, B>(
  ma: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<B>
): Managed<R, E | E1, B> {
  return collectM_(ma, e, flow(pf, O.map(succeed)))
}

export function collect<A, E1, B>(
  e: E1,
  pf: (a: A) => O.Option<B>
): <R, E>(ma: Managed<R, E, A>) => Managed<R, E1 | E, B> {
  return (ma) => collect_(ma, e, pf)
}

export function compose<R, E, A, R1, E1>(ma: Managed<R, E, A>, that: Managed<R1, E1, R>): Managed<R1, E | E1, A> {
  return pipe(
    ask<R1>(),
    flatMap((r1) => give_(that, r1)),
    flatMap((r) => give_(ma, r))
  )
}

export function eventually<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  return new Managed(I.eventually(ma.io))
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldLeft_<R, E, A, B>(as: Iterable<A>, b: B, f: (b: B, a: A) => Managed<R, E, B>): Managed<R, E, B> {
  return A.foldLeft_(Array.from(as), succeed(b) as Managed<R, E, B>, (acc, v) => flatMap_(acc, (a) => f(a, v)))
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldLeft<R, E, A, B>(b: B, f: (b: B, a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, B> {
  return (as) => foldLeft_(as, b, f)
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
  return flatMap_(mb, (b) => (b ? (onTrue() as Managed<R & R1 & R2, E | E1 | E2, B | C>) : onFalse()))
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
export const interrupt: Managed<unknown, never, never> = flatMap_(
  fromEffect(I.descriptorWith((d) => I.succeed(d.id))),
  (id) => halt(C.interrupt(id))
)

/**
 * Returns a Managed that is interrupted as if by the specified fiber.
 */
export function interruptAs(fiberId: FiberId): Managed<unknown, never, never> {
  return halt(C.interrupt(fiberId))
}

export function isFailure<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> {
  return fold_(
    ma,
    () => true,
    () => false
  )
}

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
  return flatMap_(
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
  return flatMap_(
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
  return mapEffectWith_(ma, f, identity)
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

export function option<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, O.Option<A>> {
  return fold_(ma, () => O.none(), O.some)
}

export function orDieWith_<R, E, A>(ma: Managed<R, E, A>, f: (e: E) => unknown): Managed<R, never, A> {
  return new Managed(I.orDieWith_(ma.io, f))
}

export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: Managed<R, E, A>) => Managed<R, never, A> {
  return (ma) => orDieWith_(ma, f)
}

export function orDie<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  return orDieWith_(ma, identity)
}

export function orElse_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return foldM_(ma, () => that(), succeed)
}

export function orElse<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => orElse_(ma, that)
}

export function orElseEither_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E1, E.Either<B, A>> {
  return foldM_(ma, () => map_(that(), E.left), flow(E.right, succeed))
}

export function orElseEither<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, E.Either<B, A>> {
  return (ma) => orElseEither_(ma, that)
}

export function orElseFail_<R, E, A, E1>(ma: Managed<R, E, A>, e: E1): Managed<R, E | E1, A> {
  return orElse_(ma, () => fail(e))
}

export function orElseFail<E1>(e: E1): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E1 | E, A> {
  return (ma) => orElseFail_(ma, e)
}

export function orElseOptional<R, E, A, R1, E1, B>(
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
  f: (e: E) => unknown
): Managed<R, E1, A> {
  return catchAll_(ma, (e) => O.fold_(pf(e), () => die(f(e)), fail))
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
  return (ma) => refineOrDieWith_(ma, pf, f)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E, A, E1>(ma: Managed<R, E, A>, pf: (e: E) => O.Option<E1>): Managed<R, E1, A> {
  return refineOrDieWith_(ma, pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
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
  return flatMap_(ma, (a) => O.fold_(pf(a), () => succeed(a), flatMap(fail)))
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
  return flatMap_(
    ma,
    O.fold(() => flatMap_(effectTotal(error), fail), succeed)
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
    (cause) => succeed(Ex.failure(cause)),
    (a) => succeed(Ex.succeed(a))
  )
}

export function someOrElse_<R, E, A, B>(ma: Managed<R, E, O.Option<A>>, onNone: () => B): Managed<R, E, A | B> {
  return map_(ma, O.getOrElse(onNone))
}

export function someOrElse<B>(onNone: () => B): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A | B> {
  return (ma) => someOrElse_(ma, onNone)
}

export function someOrElseM_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, O.Option<A>>,
  onNone: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return flatMap_(
    ma,
    O.fold((): Managed<R1, E1, A | B> => onNone, succeed)
  )
}

export function someOrElseM<R1, E1, B>(
  onNone: Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => someOrElseM_(ma, onNone)
}

export function someOrFailWith_<R, E, A, E1>(ma: Managed<R, E, O.Option<A>>, e: () => E1): Managed<R, E | E1, A> {
  return flatMap_(
    ma,
    O.fold(() => fail(e()), succeed)
  )
}

export function someOrFailWith<E1>(e: () => E1): <R, E, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E | E1, A> {
  return (ma) => someOrFailWith_(ma, e)
}

export function someOrFail<R, E, A>(
  ma: Managed<R, E, O.Option<A>>
): Managed<R, E | NoSuchElementException, A> {
  return someOrFailWith_(ma, () => new NoSuchElementException('Managed.someOrFailException'))
}

export function swap<R, E, A>(ma: Managed<R, E, A>): Managed<R, A, E> {
  return foldM_(ma, succeed, fail)
}

export function swapWith_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  f: (me: Managed<R, A, E>) => Managed<R1, B, E1>
): Managed<R1, E1, B> {
  return swap(f(swap(ma)))
}

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
  return flatMap_(mb, (b) => (b ? unit() : asUnit(ma)))
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

export function unwrap<R, E, R1, E1, A>(fa: I.IO<R, E, Managed<R1, E1, A>>): Managed<R & R1, E | E1, A> {
  return flatten(fromEffect(fa))
}

export function when_<R, E, A>(ma: Managed<R, E, A>, b: boolean): Managed<R, E, void> {
  return suspend(() => (b ? asUnit(ma) : unit()))
}

export function when(b: boolean): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, void> {
  return (ma) => when_(ma, b)
}

export function whenM_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  mb: Managed<R1, E1, boolean>
): Managed<R & R1, E | E1, void> {
  return flatMap_(mb, (b) => (b ? asUnit(ma) : unit()))
}

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
  return flatMap((a) =>
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
    return new GenManaged(asksService(_)(identity))
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
        return flatMap_(state.value.M, (val) => {
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
