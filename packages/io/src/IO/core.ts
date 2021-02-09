import type { Async } from '../Async'
import type { Cause } from '../Cause/core'
import type { Exit } from '../Exit/core'
import type { FiberDescriptor, InterruptStatus } from '../Fiber/core'
import type { FiberId } from '../Fiber/FiberId'
import type { FiberContext } from '../internal/FiberContext'
import type { Supervisor } from '../Supervisor'
import type { Sync } from '../Sync'
import type { FailureReporter, FIO, IO, UIO, URIO } from './primitives'
import type { Eval } from '@principia/base/Eval'
import type { Predicate, Refinement } from '@principia/base/Function'
import type { Has, Region, Tag } from '@principia/base/Has'
import type { Monoid } from '@principia/base/Monoid'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Option } from '@principia/base/Option'
import type { _E as InferE, _R as InferR, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import { bindF } from '@principia/base/Bind'
import * as E from '@principia/base/Either'
import { _bind, _bindTo, constant, flow, identity, pipe, tuple } from '@principia/base/Function'
import { isTag, mergeEnvironments, tag } from '@principia/base/Has'
import * as I from '@principia/base/Iterable'
import { makeMonoid } from '@principia/base/Monoid'
import * as NEA from '@principia/base/NonEmptyArray'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'
import * as FL from '@principia/free/FreeList'

import { runAsyncEnv } from '../Async'
import * as C from '../Cause/core'
import * as Ex from '../Exit/core'
import { isSync, runEitherEnv_ } from '../Sync'
import {
  Bind,
  CheckDescriptor,
  DeferPartial,
  DeferTotal,
  EffectAsync,
  EffectPartial,
  EffectTotal,
  Fail,
  Fold,
  Fork,
  GetInterrupt,
  Give,
  Read,
  Succeed,
  Supervise,
  Yield
} from './primitives'

export * from './primitives'

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * succeedNow :: a -> IO _ _ a
 * ```
 *
 * Creates a `IO` that has succeeded with a pure value
 *
 * @category Constructors
 * @since 1.0.0
 */
export function succeed<A = never>(a: A): UIO<A> {
  return new Succeed(a)
}

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 */
export const yieldNow: UIO<void> = new Yield()

/**
 * ```haskell
 * effectAsync :: (((IO r e a -> ()) -> ()), ?[FiberId]) -> IO r e a
 * ```
 *
 * Imports an asynchronous side-effect into a `IO`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function effectAsync<R, E, A>(
  register: (k: (_: IO<R, E, A>) => void) => void,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return new EffectAsync((cb) => {
    register(cb)
    return O.none()
  }, blockingOn)
}

/**
 * ```haskell
 * effectAsyncOption :: (((IO r e a -> ()) -> Option (IO r e a)), ?[FiberId]) -> IO r e a
 * ```
 *
 * Imports an asynchronous effect into a pure `IO`, possibly returning the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called at most once.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function effectAsyncOption<R, E, A>(
  register: (k: (_: IO<R, E, A>) => void) => O.Option<IO<R, E, A>>,
  blockingOn: ReadonlyArray<FiberId> = []
): IO<R, E, A> {
  return new EffectAsync(register, blockingOn)
}

/**
 * Imports a synchronous side-effect into an `IO`, translating any
 * thrown exceptions into typed failed effects with `IO.fail`.
 */
export function effect<A>(effect: () => A): FIO<Error, A> {
  return new EffectPartial(effect, (u) => (u instanceof Error ? u : new C.RuntimeException(`An error occurred: ${u}`)))
}

/**
 * ```haskell
 * effectTotal :: (() -> a) -> UIO a
 * ```
 *
 * Imports a total synchronous effect into a pure `IO` value.
 * The effect must not throw any exceptions. If you wonder if the effect
 * throws exceptions, then do not use this method, use `IO.effect`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function effectTotal<A>(effect: () => A): UIO<A> {
  return new EffectTotal(effect)
}

/**
 * ```haskell
 * effectCatch_ :: (() -> a, (Any -> e)) -> IO _ e a
 * ```
 *
 * Imports a synchronous side-effect into an `IO`, translating any
 * thrown exceptions into typed failed effects with `IO.fail`, and mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 */
export function effectCatch_<E, A>(effect: () => A, onThrow: (error: unknown) => E): FIO<E, A> {
  return new EffectPartial(effect, onThrow)
}

/**
 * ```haskell
 * effectCatch :: (Any -> e) -> (() -> a) -> IO _ e a
 * ```
 *
 * Imports a synchronous side-effect into an `IO`, translating any
 * thrown exceptions into typed failed effects with `IO.fail`, and mapping the error
 *
 * @category Constructors
 * @since 1.0.0
 * @dataFirst effectCatch_
 */
export function effectCatch<E>(onThrow: (error: unknown) => E): <A>(effect: () => A) => FIO<E, A> {
  return (effect) => effectCatch_(effect, onThrow)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 */
export function defer<R, E, A>(io: () => IO<R, E, A>): IO<R, E | Error, A> {
  return new DeferPartial(io, (u) => (u instanceof Error ? u : new C.RuntimeException(`An error occurred: ${u}`)))
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects,
 * translating any thrown exceptions into typed failed effects and mapping the error.
 *
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 */
export function deferCatch_<R, E, A, E1>(io: () => IO<R, E, A>, onThrow: (error: unknown) => E1): IO<R, E | E1, A> {
  return new DeferPartial(io, onThrow)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects,
 * translating any thrown exceptions into typed failed effects and mapping the error.
 *
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effect(io))`.
 */
export function deferCatch<E1>(onThrow: (error: unknown) => E1): <R, E, A>(io: () => IO<R, E, A>) => IO<R, E | E1, A> {
  return (io) => deferCatch_(io, onThrow)
}

/**
 * ```haskell
 * deferTotal :: (() -> IO r e a) -> IO r e a
 * ```
 *
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. The effect must not throw any exceptions. When no environment is required (i.e., when R == unknown)
 * it is conceptually equivalent to `flatten(effectTotal(io))`. If you wonder if the effect throws exceptions,
 * do not use this method, use `IO.defer`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function deferTotal<R, E, A>(io: () => IO<R, E, A>): IO<R, E, A> {
  return new DeferTotal(io)
}

/**
 * ```haskell
 * haltNow :: Cause e -> IO _ e _
 * ```
 *
 * Creates a `IO` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function halt<E>(cause: C.Cause<E>): FIO<E, never> {
  return new Fail(cause)
}

/**
 * ```haskell
 * fail :: e -> IO _ e _
 * ```
 *
 * Creates a `IO` that has failed with value `e`. The moral equivalent of `throw`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fail<E>(e: E): FIO<E, never> {
  return halt(C.fail(e))
}

/**
 * ```haskell
 * die :: Error -> IO _ _ _
 * ```
 *
 * Creates a `IO` that has died with the specified defect
 *
 * @category Constructors
 * @since 1.0.0
 */
export function die(e: Error): UIO<never> {
  return halt(C.die(e))
}

/**
 * Returns an IO that dies with a `RuntimeError` having the
 * specified message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function dieMessage(message: string): FIO<never, never> {
  return die(new C.RuntimeException(message))
}

/**
 * ```haskell
 * done :: Exit a b -> FIO a b
 * ```
 *
 * Creates a `IO` from an exit value
 *
 * @category Constructors
 * @since 1.0.0
 */
export function done<E, A>(exit: Exit<E, A>): FIO<E, A> {
  return deferTotal(() => {
    switch (exit._tag) {
      case 'Success': {
        return succeed(exit.value)
      }
      case 'Failure': {
        return halt(exit.cause)
      }
    }
  })
}

/**
 * Lifts an `Either` into an `IO`
 */
export function fromEither<E, A>(f: () => E.Either<E, A>): IO<unknown, E, A> {
  return bind_(effectTotal(f), E.fold(fail, succeed))
}

/**
 * Lifts an `Option` into an `IO` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromOption<A>(m: () => Option<A>): FIO<Option<never>, A> {
  return bind_(effectTotal(m), (ma) => (ma._tag === 'None' ? fail(O.none()) : pure(ma.value)))
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseCatch_<E, A>(promise: () => Promise<A>, onReject: (reason: unknown) => E): FIO<E, A> {
  return effectAsync((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(onReject, fail, resolve))
  })
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 * @dataFirst fromPromiseCatch_
 */
export function fromPromiseCatch<E>(onReject: (reason: unknown) => E): <A>(promise: () => Promise<A>) => FIO<E, A> {
  return (promise) => fromPromiseCatch_(promise, onReject)
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export function fromPromise<A>(promise: () => Promise<A>): FIO<unknown, A> {
  return effectAsync((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(fail, resolve))
  })
}

/**
 * Like fromPromise but produces a defect in case of errors
 */
export function fromPromiseDie<A>(promise: () => Promise<A>): UIO<A> {
  return effectAsync((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(die, resolve))
  })
}

/**
 * Lifts a `Sync` computation into an `IO`
 */
export function fromSync<R, E, A>(effect: Sync<R, E, A>): IO<R, E, A> {
  return asksM((_: R) => {
    const res = runEitherEnv_(effect, _)
    return E.fold_(res, fail, succeed)
  })
}

/**
 * Lifts an `Async` computation into an `IO`
 */
export function fromAsync<R, E, A>(effect: Async<R, E, A>): IO<R, E, A> {
  return asksM((_: R) =>
    effectAsync<unknown, E, A>((k) => {
      runAsyncEnv(effect, _, (ex) => {
        switch (ex._tag) {
          case 'Success': {
            k(succeed(ex.value))
            break
          }
          case 'Failure': {
            k(fail(ex.error))
            break
          }
          case 'Interrupt': {
            k(descriptorWith((d) => halt(C.interrupt(d.id))))
            break
          }
        }
      })
    })
  )
}

/**
 * ```haskell
 * supervised_ :: (IO r e a, Supervisor _) -> IO r e a
 * ```
 *
 * Returns an IO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised_<R, E, A>(fa: IO<R, E, A>, supervisor: Supervisor<any>): IO<R, E, A> {
  return new Supervise(fa, supervisor)
}

/**
 * ```haskell
 * supervised :: Supervisor _ -> IO r e a -> IO r e a
 * ```
 *
 * Returns an IO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 * @dataFirst supervised_
 */
export function supervised(supervisor: Supervisor<any>): <R, E, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => supervised_(fa, supervisor)
}

/*
 * -------------------------------------------
 * Sequential Applicative
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `IO`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): UIO<A> {
  return new Succeed(a)
}

/*
 * -------------------------------------------
 * Sequential Apply
 * -------------------------------------------
 */

/**
 * ```haskell
 * cross_ :: Apply f => (f a, f b) -> f [a, b]
 * ```
 *
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross_<R, E, A, Q, D, B>(fa: IO<R, E, A>, fb: IO<Q, D, B>): IO<Q & R, D | E, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

/**
 * ```haskell
 * cross :: Apply f => f b -> f a -> f [a, b]
 * ```
 *
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst cross_
 */
export function cross<Q, D, B>(fb: IO<Q, D, B>): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<Q, D, A, B, R, E>(fab: IO<Q, D, (a: A) => B>, fa: IO<R, E, A>): IO<Q & R, D | E, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * ```haskell
 * ap :: Apply f => f (a -> b) -> f a -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst ap_
 */
export function ap<R, E, A>(fa: IO<R, E, A>): <Q, D, B>(fab: IO<Q, D, (a: A) => B>) => IO<Q & R, E | D, B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<R, E, A, Q, D, B>(fa: IO<R, E, A>, fb: IO<Q, D, B>): IO<Q & R, D | E, A> {
  return bind_(fa, (a) => map_(fb, () => a))
}

/**
 * @dataFirst apl_
 */
export function apl<Q, D, B>(fb: IO<Q, D, B>): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, A> {
  return (fa) => apl_(fa, fb)
}

/**
 * ```haskell
 * _apr :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apr_<R, E, A, Q, D, B>(fa: IO<R, E, A>, fb: IO<Q, D, B>): IO<Q & R, D | E, B> {
  return bind_(fa, () => fb)
}

/**
 * ```haskell
 * apr :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst apr_
 */
export function apr<Q, D, B>(fb: IO<Q, D, B>): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, B> {
  return (fa) => apr_(fa, fb)
}

export function crossWith_<R, E, A, Q, D, B, C>(
  fa: IO<R, E, A>,
  fb: IO<Q, D, B>,
  f: (a: A, b: B) => C
): IO<Q & R, D | E, C> {
  return bind_(fa, (ra) => map_(fb, (rb) => f(ra, rb)))
}

/**
 * @dataFirst crossWith_
 */
export function crossWith<A, Q, D, B, C>(
  fb: IO<Q, D, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: IO<R, E, A>) => IO<Q & R, D | E, C> {
  return (fa) => crossWith_(fa, fb, f)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

/**
 * Returns an IO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap_<R, E, A, G, B>(pab: IO<R, E, A>, f: (e: E) => G, g: (a: A) => B): IO<R, G, B> {
  return foldM_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  )
}

/**
 * Returns an IO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap<E, G, A, B>(f: (e: E) => G, g: (a: A) => B): <R>(pab: IO<R, E, A>) => IO<R, G, B> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * ```haskell
 * mapError_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an IO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapError_<R, E, A, D>(fea: IO<R, E, A>, f: (e: E) => D): IO<R, D, A> {
  return foldCauseM_(fea, flow(C.map(f), halt), succeed)
}

/**
 * ```haskell
 * mapError :: Bifunctor p => (a -> b) -> p a c -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an IO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapError<E, D>(f: (e: E) => D): <R, A>(fea: IO<R, E, A>) => IO<R, D, A> {
  return (fea) => mapError_(fea, f)
}

/*
 * -------------------------------------------
 * Fallible IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * absolve :: IO r e (Either e1 a) -> IO r (e | e1) a
 * ```
 *
 * Returns an `IO` that submerges an `Either` into the `IO`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absolve<R, E, E1, A>(ma: IO<R, E, E.Either<E1, A>>): IO<R, E | E1, A> {
  return bind_(ma, E.fold(fail, succeed))
}

/**
 * ```haskell
 * attempt :: IO r e a -> IO r ~ (Either e a)
 * ```
 *
 * Folds an `IO` that may fail with `E` or succeed with `A` into one that never fails but succeeds with `Either<E, A>`
 */
export function attempt<R, E, A>(ma: IO<R, E, A>): IO<R, never, E.Either<E, A>> {
  return fold_(ma, E.left, E.right)
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM_` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Fold(ma, onFailure, onSuccess)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 * @dataFirst foldCauseM_
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => new Fold(ma, onFailure, onSuccess)
}

export function foldM_<R, R1, R2, E, E1, E2, A, A1, A2>(
  ma: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return foldCauseM_(ma, (cause) => E.fold_(C.failureOrCause(cause), onFailure, halt), onSuccess)
}

/**
 * @dataFirst foldM_
 */
export function foldM<R1, R2, E, E1, E2, A, A1, A2>(
  onFailure: (e: E) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => foldM_(ma, onFailure, onSuccess)
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, B, C>(
  fa: IO<R, E, A>,
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): IO<R, never, B | C> {
  return foldM_(fa, flow(onFailure, succeed), flow(onSuccess, succeed))
}

/**
 * Folds over the failure value or the success value to yield an IO that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @dataFirst fold_
 */
export function fold<E, A, B, C>(
  onFailure: (reason: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: IO<R, E, A>) => IO<R, never, B | C> {
  return (ma) => fold_(ma, onFailure, onSuccess)
}

/*
 * -------------------------------------------
 * Functor IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<R, E, A, B>(fa: IO<R, E, A>, f: (a: A) => B): IO<R, E, B> {
  return bind_(fa, (a) => succeed(f(a)))
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `IO` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: IO<R, E, A>) => IO<R, E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

/**
 * ```haskell
 * bind_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind_<R, E, A, U, G, B>(ma: IO<R, E, A>, f: (a: A) => IO<U, G, B>): IO<R & U, E | G, B> {
  return new Bind(ma, f)
}

/**
 * ```haskell
 * bind :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 * @dataFirst bind_
 */
export function bind<A, U, G, B>(f: (a: A) => IO<U, G, B>): <R, E>(ma: IO<R, E, A>) => IO<R & U, G | E, B> {
  return (ma) => bind_(ma, f)
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `IO`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<R, E, Q, D, A>(ffa: IO<R, E, IO<Q, D, A>>) {
  return bind_(ffa, identity)
}

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<R, E, A, Q, D, B>(fa: IO<R, E, A>, f: (a: A) => IO<Q, D, B>): IO<Q & R, D | E, A> {
  return bind_(fa, (a) =>
    pipe(
      f(a),
      bind(() => succeed(a))
    )
  )
}

/**
 * ```haskell
 * tap :: Monad m => (a -> m b) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 * @dataFirst tap_
 */
export function tap<A, Q, D, B>(f: (a: A) => IO<Q, D, B>): <R, E>(fa: IO<R, E, A>) => IO<Q & R, D | E, A> {
  return (fa) => tap_(fa, f)
}

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  fa: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
) {
  return foldCauseM_(
    fa,
    (c) =>
      E.fold_(
        C.failureOrCause(c),
        (e) => bind_(onFailure(e), () => halt(c)),
        (_) => halt(c)
      ),
    onSuccess
  )
}

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 * @dataFirst tapBoth_
 */
export function tapBoth<E, A, R1, E1, R2, E2>(
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
): <R>(fa: IO<R, E, A>) => IO<R & R1 & R2, E | E1 | E2, any> {
  return (fa) => tapBoth_(fa, onFailure, onSuccess)
}

/**
 * Returns an IO that effectfully "peeks" at the failure of this effect.
 */
export function tapError_<R, E, A, R1, E1>(fa: IO<R, E, A>, f: (e: E) => IO<R1, E1, any>) {
  return foldCauseM_(
    fa,
    (c) =>
      E.fold_(
        C.failureOrCause(c),
        (e) => bind_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    pure
  )
}

/**
 * Returns an IO that effectfully "peeks" at the failure of this effect.
 * @dataFirst tapError_
 */
export function tapError<E, R1, E1>(f: (e: E) => IO<R1, E1, any>): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => tapError_(fa, f)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

/**
 * ```haskell
 * asks :: MonadEnv m => (r -> a) -> m r a
 * ```
 *
 * Accesses the environment provided to an `IO`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function asks<R, A>(f: (_: R) => A): URIO<R, A> {
  return new Read((_: R) => new Succeed(f(_)))
}

/**
 * ```haskell
 * asksM :: MonadEnv m => (q -> m r a) -> m (r & q) a
 * ```
 *
 * Effectfully accesses the environment provided to an `IO`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function asksM<Q, R, E, A>(f: (r: Q) => IO<R, E, A>): IO<R & Q, E, A> {
  return new Read(f)
}

/**
 * ```haskell
 * giveAll_ :: MonadEnv m => (m r a, r) -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `IO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function giveAll_<R, E, A>(ma: IO<R, E, A>, r: R): FIO<E, A> {
  return new Give(ma, r)
}

/**
 * ```haskell
 * giveAll :: MonadEnv m => r -> m r a -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `IO` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 * @dataFirst giveAll_
 */
export function giveAll<R>(r: R): <E, A>(ma: IO<R, E, A>) => IO<unknown, E, A> {
  return (ma) => giveAll_(ma, r)
}

/**
 * ```haskell
 * gives_ :: MonadEnv m => (m r a, (r0 -> r)) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function gives_<R0, R, E, A>(ma: IO<R, E, A>, f: (r0: R0) => R) {
  return asksM((r0: R0) => giveAll_(ma, f(r0)))
}

/**
 * ```haskell
 * gives :: MonadEnv m => (r0 -> r) -> m r a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 * @dataFirst gives_
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: IO<R, E, A>) => IO<R0, E, A> {
  return (ma) => gives_(ma, f)
}

/**
 * ```haskell
 * give_ :: MonadEnv m => (m (r & r0) a, r) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export function give_<E, A, R = unknown, R0 = unknown>(ma: IO<R & R0, E, A>, r: R): IO<R0, E, A> {
  return gives_(ma, (r0) => ({ ...r0, ...r }))
}

/**
 * ```haskell
 * give :: MonadEnv m => r -> m (r & r0) a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `IO`,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 * @dataFirst give_
 */
export function give<R = unknown>(r: R): <E, A, R0 = unknown>(ma: IO<R & R0, E, A>) => IO<R0, E, A> {
  return (ma) => give_(ma, r)
}

export function ask<R>(): IO<R, never, R> {
  return asks((_: R) => _)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): UIO<void> {
  return succeed(undefined)
}

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

const of: UIO<{}> = succeed({})
export { of as do }

export function bindS<R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => IO<R, E, A>
): <R2, E2>(
  mk: IO<R2, E2, K>
) => IO<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> {
  return bind((a) =>
    pipe(
      f(a),
      map((b) => _bind(a, name, b))
    )
  )
}

export function bindTo<K, N extends string>(
  name: Exclude<N, keyof K>
): <R, E, A>(fa: IO<R, E, A>) => IO<R, E, { [k in Exclude<N, keyof K>]: A }> {
  return (fa) => map_(fa, _bindTo(name))
}

export function letS<K, N extends string, A>(name: Exclude<N, keyof K>, f: (_: K) => A) {
  return bindS(name, flow(f, succeed))
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * ```haskell
 * absorbWith_ :: (IO r e a, (e -> _)) -> IO r _ a
 * ```
 *
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function absorbWith_<R, E, A>(ma: IO<R, E, A>, f: (e: E) => unknown) {
  return pipe(ma, sandbox, foldM(flow(C.squash(f), fail), pure))
}

/**
 * ```haskell
 * absorbWith :: (e -> _) -> IO r e a -> IO r _ a
 * ```
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @category Combinators
 * @since 1.0.0
 * @dataFirst absorbWith_
 */
export function absorbWith<E>(f: (e: E) => unknown): <R, A>(ma: IO<R, E, A>) => IO<R, unknown, A> {
  return (ma) => absorbWith_(ma, f)
}

/**
 * ```haskell
 * as_ :: (IO r e a, b) -> IO r e b
 * ```
 *
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function as_<R, E, A, B>(ma: IO<R, E, A>, b: () => B): IO<R, E, B> {
  return map_(ma, () => b())
}

/**
 * ```haskell
 * as :: b -> IO r e a -> IO r e b
 * ```
 *
 * Maps the success value of this IO to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 * @dataFirst as_
 */
export function as<B>(b: () => B): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, B> {
  return (ma) => as_(ma, b)
}

/**
 * ```haskell
 * asSome :: IO r e a -> IO r e (Option a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(ma: IO<R, E, A>): IO<R, E, Option<A>> {
  return map_(ma, O.some)
}

/**
 * ```haskell
 * asSomeError :: IO r e a -> IO r (Option e) a
 * ```
 *
 * Maps the error value of this IO to an optional value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const asSomeError: <R, E, A>(ma: IO<R, E, A>) => IO<R, O.Option<E>, A> = mapError(O.some)

/**
 * Ignores the result of the IO, replacing it with unit
 *
 * @category Combinators
 * @since 1.0.0
 */
export function asUnit<R, E>(ma: IO<R, E, any>): IO<R, E, void> {
  return bind_(ma, () => unit())
}

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, f: (e: E) => IO<R1, E1, A1>): IO<R & R1, E1, A | A1> {
  return foldM_(ma, f, (x) => succeed(x))
}

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 * @dataFirst catchAll_
 */
export function catchAll<R, E, E2, A>(
  f: (e: E2) => IO<R, E, A>
): <R2, A2>(ma: IO<R2, E2, A2>) => IO<R2 & R, E, A | A2> {
  return (ma) => catchAll_(ma, f)
}

/**
 * ```haskell
 * catchAllCause_ :: (IO r e a, (Cause e -> IO r1 e1 b)) -> IO (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAllCause_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, f: (_: Cause<E>) => IO<R1, E1, A1>) {
  return foldCauseM_(ma, f, pure)
}

/**
 * ```haskell
 * catchAllCause :: (Cause e -> IO r1 e1 b) -> IO r e a -> IO (r & r1) e1 (a | b)
 * ```
 *
 * Recovers from all errors with provided cause.
 *
 * @category Combinators
 * @since 1.0.0
 * @dataFirst catchAllCause_
 */
export function catchAllCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => IO<R1, E1, A1>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E1, A1 | A> {
  return (ma) => catchAllCause_(ma, f)
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (e: E) => O.Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return foldCauseM_(
    ma,
    (cause): IO<R1, E | E1, A1> =>
      pipe(
        cause,
        C.failureOrCause,
        E.fold(
          flow(
            f,
            O.getOrElse(() => halt(cause))
          ),
          halt
        )
      ),
    succeed
  )
}

/**
 * Recovers from some or all of the error cases.
 * @dataFirst catchSome_
 */
export function catchSome<E, R1, E1, A1>(
  f: (e: E) => O.Option<IO<R1, E1, A1>>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (fa) => catchSome_(fa, f)
}

/**
 * Recovers from some or all of the error cases with provided cause.
 */
export function catchSomeCause_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (_: Cause<E>) => O.Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return foldCauseM_(
    ma,
    (c): IO<R1, E1 | E, A1> =>
      O.fold_(
        f(c),
        () => halt(c),
        (a) => a
      ),
    (x) => succeed(x)
  )
}

/**
 * Recovers from some or all of the error cases with provided cause.
 * @dataFirst catchSomeCause_
 */
export function catchSomeCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => O.Option<IO<R1, E1, A1>>
): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (ma) => catchSomeCause_(ma, f)
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between IO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchSomeDefect_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (_: unknown) => Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return catchAll_(unrefineWith_(ma, f, fail), (s): IO<R1, E | E1, A1> => s)
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * *WARNING*: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between IO and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @category Combinators
 * @since 1.0.0
 * @dataFirst catchSomeDefect_
 */
export function catchSomeDefect<R1, E1, A1>(
  f: (_: unknown) => Option<IO<R1, E1, A1>>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  return (ma) => catchSomeDefect_(ma, f)
}

export function cause<R, E, A>(ma: IO<R, E, A>): IO<R, never, Cause<E>> {
  return foldCauseM_(ma, succeed, () => succeed(C.empty))
}

export function causeAsError<R, E, A>(ma: IO<R, E, A>): IO<R, Cause<E>, A> {
  return foldCauseM_(ma, fail, pure)
}

/**
 * Checks the interrupt status, and produces the IO returned by the
 * specified callback.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function checkInterruptible<R, E, A>(f: (i: InterruptStatus) => IO<R, E, A>): IO<R, E, A> {
  return new GetInterrupt(f)
}

export function collect_<R, E, A, E1, A1>(ma: IO<R, E, A>, f: () => E1, pf: (a: A) => Option<A1>): IO<R, E | E1, A1> {
  return collectM_(ma, f, flow(pf, O.map(succeed)))
}

/**
 * @dataFirst collect_
 */
export function collect<A, E1, A1>(
  f: () => E1,
  pf: (a: A) => Option<A1>
): <R, E>(ma: IO<R, E, A>) => IO<R, E1 | E, A1> {
  return (ma) => collect_(ma, f, pf)
}

export function collectAll<R, E, A>(as: Iterable<IO<R, E, A>>): IO<R, E, readonly A[]> {
  return foreach_(as, identity)
}

export function collectAllUnit<R, E, A>(as: Iterable<IO<R, E, A>>): IO<R, E, void> {
  return foreachUnit_(as, identity)
}

export function collectM_<R, E, A, R1, E1, A1, E2>(
  ma: IO<R, E, A>,
  f: () => E2,
  pf: (a: A) => Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1 | E2, A1> {
  return bind_(
    ma,
    (a): IO<R1, E1 | E2, A1> =>
      pipe(
        pf(a),
        O.getOrElse(() => fail(f()))
      )
  )
}

export function collectM<A, R1, E1, A1, E2>(
  f: () => E2,
  pf: (a: A) => Option<IO<R1, E1, A1>>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E2 | E, A1> {
  return (ma) => collectM_(ma, f, pf)
}

export function compose_<R, E, A, R0, E1>(me: IO<R, E, A>, that: IO<R0, E1, R>): IO<R0, E1 | E, A> {
  return bind_(that, (r) => giveAll_(me, r))
}

export function compose<R, R0, E1>(that: IO<R0, E1, R>): <E, A>(me: IO<R, E, A>) => IO<R0, E1 | E, A> {
  return (me) => compose_(me, that)
}

export function cond_<R, R1, E, A>(b: boolean, onTrue: () => URIO<R, A>, onFalse: () => URIO<R1, E>): IO<R & R1, E, A> {
  return deferTotal((): IO<R & R1, E, A> => (b ? onTrue() : bind_(onFalse(), fail)))
}

export function cond<R, R1, E, A>(
  onTrue: () => URIO<R, A>,
  onFalse: () => URIO<R1, E>
): (b: boolean) => IO<R & R1, E, A> {
  return (b) => cond_(b, onTrue, onFalse)
}

/**
 * Constructs an IO based on information about the current fiber, such as
 * its identity.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function descriptorWith<R, E, A>(f: (d: FiberDescriptor) => IO<R, E, A>): IO<R, E, A> {
  return new CheckDescriptor(f)
}

/**
 * Returns information about the current fiber, such as its identity.
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function descriptor(): IO<unknown, never, FiberDescriptor> {
  return descriptorWith(succeed)
}

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w w a
 * ```
 */
export function duplicate<R, E, A>(wa: IO<R, E, A>): IO<R, E, IO<R, E, A>> {
  return extend_(wa, identity)
}

export function errorAsCause<R, E, A>(ma: IO<R, Cause<E>, A>): IO<R, E, A> {
  return foldM_(ma, halt, pure)
}

export function eventually<R, E, A>(ma: IO<R, E, A>): IO<R, never, A> {
  return orElse_(ma, () => eventually(ma))
}

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export function extend_<R, E, A, B>(wa: IO<R, E, A>, f: (wa: IO<R, E, A>) => B): IO<R, E, B> {
  return foldM_(
    wa,
    (e) => fail(e),
    (_) => pure(f(wa))
  )
}

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export function extend<R, E, A, B>(f: (wa: IO<R, E, A>) => B): (wa: IO<R, E, A>) => IO<R, E, B> {
  return (wa) => extend_(wa, f)
}

/**
 * Returns an effect that evaluates the given `Eval`.
 */
export function evaluate<A>(a: Eval<A>): UIO<A> {
  return effectTotal(() => a.value)
}

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter<A, R, E>(f: (a: A) => IO<R, E, boolean>) {
  return (as: Iterable<A>) => filter_(as, f)
}

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>): IO<R, E, readonly A[]> {
  return I.foldl_(as, pure([]) as IO<R, E, A[]>, (ma, a) =>
    crossWith_(ma, f(a), (as_, p) => {
      if (p) {
        as_.push(a)
      }
      return as_
    })
  )
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 */
export function filterNot_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) {
  return filter_(
    as,
    flow(
      f,
      map((b) => !b)
    )
  )
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 */
export function filterNot<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (as) => filterNot_(as, f)
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse_<R, E, A, B extends A, R1, E1, A1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, B | A1>
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1>
export function filterOrElse_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  or: (a: A) => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return bind_(fa, (a): IO<R1, E1, A | A1> => (predicate(a) ? succeed(a) : or(a)))
}

/**
 * Applies `or` if the predicate fails.
 */
export function filterOrElse<A, B extends A>(
  refinement: Refinement<A, B>
): <R1, E1, A1>(or: (a: A) => IO<R1, E1, A1>) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>
export function filterOrElse<A>(
  predicate: Predicate<A>
): <R1, E1, A1>(or: (a: A) => IO<R1, E1, A1>) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1>
export function filterOrElse<A>(
  predicate: Predicate<A>
): <R1, E1, A1>(or: (a: A) => IO<R1, E1, A1>) => <R, E>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (or) => (fa) => filterOrElse_(fa, predicate, or)
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  dieWith: (a: A) => Error
): IO<R, E, A>
export function filterOrDie_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, dieWith: (a: A) => Error): IO<R, E, A>
export function filterOrDie_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, dieWith: (a: A) => Error): IO<R, E, A> {
  return filterOrElse_(fa, predicate, flow(dieWith, die))
}

/**
 * Dies with specified `unknown` if the predicate fails.
 */
export function filterOrDie<A, B extends A>(
  refinement: Refinement<A, B>
): (dieWith: (a: A) => Error) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDie<A>(
  predicate: Predicate<A>
): (dieWith: (a: A) => Error) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDie<A>(
  predicate: Predicate<A>
): (dieWith: (a: A) => Error) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (dieWith) => (fa) => filterOrDie_(fa, predicate, dieWith)
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  message: (a: A) => string
): IO<R, E, A>
export function filterOrDieMessage_<R, E, A>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  message: (a: A) => string
): IO<R, E, A>
export function filterOrDieMessage_<R, E, A>(fa: IO<R, E, A>, predicate: Predicate<A>, message: (a: A) => string) {
  return filterOrDie_(fa, predicate, (a) => new Error(message(a)))
}

/**
 * Dies with an `Error` having the specified message
 * if the predicate fails.
 */
export function filterOrDieMessage<A, B extends A>(
  refinement: Refinement<A, B>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDieMessage<A>(
  predicate: Predicate<A>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A>
export function filterOrDieMessage<A>(
  predicate: Predicate<A>
): (message: (a: A) => string) => <R, E>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (message) => (fa) => filterOrDieMessage_(fa, predicate, message)
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail_<R, E, A, B extends A, E1>(
  fa: IO<R, E, A>,
  refinement: Refinement<A, B>,
  failWith: (a: A) => E1
): IO<R, E | E1, B>
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): IO<R, E | E1, A>
export function filterOrFail_<R, E, A, E1>(
  fa: IO<R, E, A>,
  predicate: Predicate<A>,
  failWith: (a: A) => E1
): IO<R, E | E1, A> {
  return filterOrElse_(fa, predicate, flow(failWith, fail))
}

/**
 * Fails with `failWith` if the predicate fails.
 */
export function filterOrFail<A, B extends A>(
  refinement: Refinement<A, B>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, B>
export function filterOrFail<A>(
  predicate: Predicate<A>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A>
export function filterOrFail<A>(
  predicate: Predicate<A>
): <E1>(failWith: (a: A) => E1) => <R, E>(fa: IO<R, E, A>) => IO<R, E | E1, A> {
  return (failWith) => (fa) => filterOrFail_(fa, predicate, failWith)
}

/**
 * Returns an `IO` that yields the value of the first
 * `IO` to succeed.
 */
export function firstSuccess<R, E, A>(mas: NonEmptyArray<IO<R, E, A>>): IO<R, E, A> {
  return A.foldl_(NEA.tail(mas), NEA.head(mas), (b, a) => orElse_(b, () => a))
}

export function bindError_<R, R1, E, E1, A>(ma: IO<R, E, A>, f: (e: E) => IO<R1, never, E1>): IO<R & R1, E1, A> {
  return swapWith_(ma, bind(f))
}

export function bindError<E, R1, E1>(f: (e: E) => IO<R1, never, E1>): <R, A>(ma: IO<R, E, A>) => IO<R & R1, E1, A> {
  return (ma) => bindError_(ma, f)
}

/**
 * A more powerful version of `fold_` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause_<R, E, A, A1, A2>(
  ma: IO<R, E, A>,
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): IO<R, never, A1 | A2> {
  return foldCauseM_(ma, flow(onFailure, pure), flow(onSuccess, pure))
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause<E, A, A1, A2>(
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): <R>(ma: IO<R, E, A>) => IO<R, never, A1 | A2> {
  return (ma) => foldCause_(ma, onFailure, onSuccess)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced IOs sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreachUnit_<R, E, A>(as: Iterable<A>, f: (a: A) => IO<R, E, any>): IO<R, E, void> {
  return I.foldMap(makeMonoid<IO<R, E, void>>((x, y) => bind_(x, () => y), unit()))(f)(as)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced IOs sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreachUnit<R, E, A>(f: (a: A) => IO<R, E, any>): (as: Iterable<A>) => IO<R, E, void> {
  return (as) => foreachUnit_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreach_<R, E, A, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>): IO<R, E, ReadonlyArray<B>> {
  return map_(
    I.foldl_(as, succeed(FL.empty<B>()) as IO<R, E, FL.FreeList<B>>, (b, a) =>
      crossWith_(
        b,
        deferTotal(() => f(a)),
        (acc, r) => FL.append_(acc, r)
      )
    ),
    FL.toArray
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreach<R, E, A, B>(f: (a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f)
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldl_<A, B, R, E>(as: Iterable<A>, b: B, f: (b: B, a: A) => IO<R, E, B>): IO<R, E, B> {
  return A.foldl_(Array.from(as), succeed(b) as IO<R, E, B>, (acc, el) => bind_(acc, (a) => f(a, el)))
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldl<R, E, A, B>(b: B, f: (b: B, a: A) => IO<R, E, B>): (as: Iterable<A>) => IO<R, E, B> {
  return (as) => foldl_(as, b, f)
}

/**
 * Combines an array of `IO`s using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap_<M>(M: Monoid<M>): <R, E, A>(as: ReadonlyArray<IO<R, E, A>>, f: (a: A) => M) => IO<R, E, M> {
  return (as, f) => foldl_(as, M.nat, (x, a) => pipe(a, map(flow(f, (y) => M.combine_(x, y)))))
}

/**
 * Combines an array of `IO`s using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMap<M>(M: Monoid<M>): <A>(f: (a: A) => M) => <R, E>(as: ReadonlyArray<IO<R, E, A>>) => IO<R, E, M> {
  return (f) => (as) => foldMap_(M)(as, f)
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldr_<A, B, R, E>(i: Iterable<A>, b: B, f: (a: A, b: B) => IO<R, E, B>): IO<R, E, B> {
  return A.foldr_(Array.from(i), succeed(b) as IO<R, E, B>, (el, acc) => bind_(acc, (a) => f(el, a)))
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldr<A, B, R, E>(b: B, f: (a: A, b: B) => IO<R, E, B>): (i: Iterable<A>) => IO<R, E, B> {
  return (i) => foldr_(i, b, f)
}

/**
 * Repeats this effect forever (until the first failure).
 */
export function forever<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  return bind_(ma, () => forever(ma))
}

/**
 * Returns an IO that forks this IO into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the IO.
 *
 * You can use the `fork` method whenever you want to execute an IO in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * IOs. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods interrupt the fiber and to
 * wait for it to finish executing the IO. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 */
export function fork<R, E, A>(ma: IO<R, E, A>): URIO<R, FiberContext<E, A>> {
  return new Fork(ma, O.none(), O.none())
}

/**
 * Returns an IO that forks this IO into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the IO.
 *
 * You can use the `fork` method whenever you want to execute an IO in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * IOs. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods interrupt the fiber and to
 * wait for it to finish executing the IO. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 */
export function forkReport(reportFailure: FailureReporter): <R, E, A>(ma: IO<R, E, A>) => URIO<R, FiberContext<E, A>> {
  return (ma) => new Fork(ma, O.none(), O.some(reportFailure))
}

/**
 * Unwraps the optional success of an `IO`, but can fail with a `None` value.
 */
export function get<R, E, A>(ma: IO<R, E, O.Option<A>>): IO<R, O.Option<E>, A> {
  return foldCauseM_(
    ma,
    flow(C.map(O.some), halt),
    O.fold(() => fail(O.none()), pure)
  )
}

/**
 * ```haskell
 * someOrElse_ :: IO t => (t x r e (Option a), (() -> b)) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getOrElse_<R, E, A, B>(ma: IO<R, E, Option<A>>, orElse: () => B): IO<R, E, A | B> {
  return pipe(ma, map(O.getOrElse(orElse)))
}

/**
 * ```haskell
 * someOrElse :: IO t => (() -> b) -> t x r e (Option a) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getOrElse<B>(orElse: () => B): <R, E, A>(ma: IO<R, E, Option<A>>) => IO<R, E, B | A> {
  return (ma) => getOrElse_(ma, orElse)
}

/**
 * ```haskell
 * someOrElseM_ :: IO t => (t x r e (Option a), t x1 r1 e1 b) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getOrElseM_<R, E, A, R1, E1, B>(
  ma: IO<R, E, Option<A>>,
  orElse: IO<R1, E1, B>
): IO<R & R1, E | E1, A | B> {
  return bind_(ma as IO<R, E, Option<A | B>>, flow(O.map(pure), O.getOrElse(constant(orElse))))
}

/**
 * ```haskell
 * someOrElseM :: IO t => t x1 r1 e1 b -> t x r e (Option a) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getOrElseM<R1, E1, B>(
  orElse: IO<R1, E1, B>
): <R, E, A>(ma: IO<R, E, Option<A>>) => IO<R & R1, E1 | E, B | A> {
  return (ma) => getOrElseM_(ma, orElse)
}

/**
 * Lifts an Option into an IO, if the option is `None` it fails with NoSuchElementException.
 */
export function getOrFail<A>(v: () => Option<A>): FIO<NoSuchElementException, A> {
  return getOrFailWith_(v, () => new NoSuchElementException('IO.getOrFail'))
}

/**
 * Lifts an Option into an IO. If the option is `None`, fail with the `e` value.
 */
export function getOrFailWith_<E, A>(v: () => Option<A>, e: () => E): FIO<E, A> {
  return deferTotal(() => O.fold_(v(), () => fail(e()), succeed))
}

/**
 * Lifts an Option into an IO. If the option is `None`, fail with the `e` value.
 */
export function getOrFailWith<E>(e: () => E): <A>(v: () => Option<A>) => FIO<E, A> {
  return (v) => getOrFailWith_(v, e)
}

/**
 * Lifts an Option into a IO, if the option is `None` it fails with Unit.
 */
export function getOrFailUnit<A>(v: () => Option<A>): FIO<void, A> {
  return getOrFailWith_(v, () => undefined)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ifM_<R, E, R1, E1, A1, R2, E2, A2>(
  mb: IO<R, E, boolean>,
  onTrue: () => IO<R1, E1, A1>,
  onFalse: () => IO<R2, E2, A2>
): IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return bind_(mb, (x) => (x ? (onTrue() as IO<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()))
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ifM<R1, E1, A1, R2, E2, A2>(
  onTrue: () => IO<R1, E1, A1>,
  onFalse: () => IO<R2, E2, A2>
): <R, E>(b: IO<R, E, boolean>) => IO<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return (b) => ifM_(b, onTrue, onFalse)
}

export function if_<R, E, A, R1, E1, A1>(
  b: () => boolean,
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return ifM_(effectTotal(b), onTrue, onFalse)
}

function _if<R, E, A, R1, E1, A1>(
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): (b: () => boolean) => IO<R & R1, E | E1, A | A1> {
  return (b) => if_(b, onTrue, onFalse)
}
export { _if as if }

/**
 * Folds a `IO` to a boolean describing whether or not it is a failure
 */
export function isFailure<R, E, A>(ma: IO<R, E, A>): IO<R, never, boolean> {
  return fold_(
    ma,
    () => true,
    () => false
  )
}

/**
 * Folds a `IO` to a boolean describing whether or not it is a success
 */
export function isSuccess<R, E, A>(ma: IO<R, E, A>): IO<R, never, boolean> {
  return fold_(
    ma,
    () => false,
    () => true
  )
}

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial;
 *
 * while (cont(s)) {
 *   s = body(s);
 * }
 *
 * return s;
 * ```
 */
export function iterate_<R, E, A>(initial: A, cont: (a: A) => boolean, body: (a: A) => IO<R, E, A>): IO<R, E, A> {
  return cont(initial) ? bind_(body(initial), (a) => iterate_(a, cont, body)) : succeed(initial)
}

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial;
 *
 * while (cont(s)) {
 *   s = body(s);
 * }
 *
 * return s;
 * ```
 */
export function iterate<R, E, A>(cont: (b: A) => boolean, body: (b: A) => IO<R, E, A>): (initial: A) => IO<R, E, A> {
  return (initial) => iterate_(initial, cont, body)
}

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export const join_ = <R, E, A, R1, E1, A1>(
  io: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<E.Either<R, R1>, E | E1, A | A1> =>
  asksM(
    (_: E.Either<R, R1>): IO<E.Either<R, R1>, E | E1, A | A1> =>
      E.fold_(
        _,
        (r) => giveAll_(io, r),
        (r1) => giveAll_(that, r1)
      )
  )

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export const join = <R1, E1, A1>(that: IO<R1, E1, A1>) => <R, E, A>(
  io: IO<R, E, A>
): IO<E.Either<R, R1>, E | E1, A | A1> => join_(io, that)

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export const joinEither_ = <R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  mb: IO<R1, E1, A1>
): IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
  asksM(
    (_: E.Either<R, R1>): IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> =>
      E.fold_(
        _,
        (r) => map_(giveAll_(ma, r), E.left),
        (r1) => map_(giveAll_(mb, r1), E.right)
      )
  )

/**
 * Joins two `IOs` into one, where one or the other is returned depending on the provided environment
 */
export function joinEither<R1, E1, A1>(
  mb: IO<R1, E1, A1>
): <R, E, A>(ma: IO<R, E, A>) => IO<E.Either<R, R1>, E | E1, E.Either<A, A1>> {
  return (ma) => joinEither_(ma, mb)
}

/**
 *  Returns an IO with the value on the left part.
 */
export function left<A>(a: () => A): UIO<E.Either<A, never>> {
  return bind_(effectTotal(a), flow(E.left, pure))
}

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```typescript
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 * ```
 */
export function loop<B>(
  initial: B
): (cont: (a: B) => boolean, inc: (b: B) => B) => <R, E, A>(body: (b: B) => IO<R, E, A>) => IO<R, E, ReadonlyArray<A>> {
  return (cont, inc) => (body) => {
    if (cont(initial)) {
      return bind_(body(initial), (a) =>
        pipe(
          loop(inc(initial))(cont, inc)(body),
          map((as) => [a, ...as])
        )
      )
    } else {
      return pure([])
    }
  }
}

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 */
export function loopUnit<A>(
  initial: A
): (cont: (a: A) => boolean, inc: (a: A) => A) => <R, E>(body: (a: A) => IO<R, E, any>) => IO<R, E, void> {
  return (cont, inc) => (body) => {
    if (cont(initial)) {
      return pipe(
        body(initial),
        bind(() => loop(inc(initial))(cont, inc)(body)),
        asUnit
      )
    } else {
      return unit()
    }
  }
}

export function mapEffectCatch_<R, E, A, E1, B>(
  io: IO<R, E, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E1
): IO<R, E | E1, B> {
  return bind_(io, (a) => effectCatch_(() => f(a), onThrow))
}

export function mapEffectCatch<E1>(onThrow: (u: unknown) => E1) {
  return <A, B>(f: (a: A) => B) => <R, E>(io: IO<R, E, A>): IO<R, E | E1, B> => mapEffectCatch_(io, f, onThrow)
}

/**
 * ```haskell
 * mapErrorCause_ :: IO t => (t x r e a, (Cause e -> Cause e1)) -> t x r e1 a
 * ```
 *
 * Returns an IO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function mapErrorCause_<R, E, A, E1>(ma: IO<R, E, A>, f: (cause: Cause<E>) => Cause<E1>): IO<R, E1, A> {
  return foldCauseM_(ma, (c) => halt(f(c)), pure)
}

/**
 * ```haskell
 * mapErrorCause :: IO t => (Cause e -> Cause e1) -> t x r e a -> t x r e1 a
 * ```
 *
 * Returns an IO with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function mapErrorCause<E, E1>(f: (cause: Cause<E>) => Cause<E1>) {
  return <R, A>(ma: IO<R, E, A>): IO<R, E1, A> => mapErrorCause_(ma, f)
}

export function merge<R, E, A>(io: IO<R, E, A>): IO<R, never, A | E> {
  return foldM_(io, succeed, succeed)
}

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export function mergeAll_<R, E, A, B>(fas: Iterable<IO<R, E, A>>, b: B, f: (b: B, a: A) => B): IO<R, E, B> {
  return I.foldl_(fas, pure(b) as IO<R, E, B>, (_b, a) => crossWith_(_b, a, f))
}

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export function mergeAll<A, B>(b: B, f: (b: B, a: A) => B) {
  return <R, E>(fas: Iterable<IO<R, E, A>>): IO<R, E, B> => mergeAll_(fas, b, f)
}

export function onLeft<C>(): <R, E, A>(io: IO<R, E, A>) => IO<E.Either<R, C>, E, E.Either<A, C>> {
  return (io) => joinEither_(io, ask<C>())
}

export function onRight<C>(): <R, E, A>(io: IO<R, E, A>) => IO<E.Either<C, R>, E, E.Either<C, A>> {
  return (io) => joinEither_(ask<C>(), io)
}

export function option<R, E, A>(io: IO<R, E, A>): URIO<R, Option<A>> {
  return fold_(
    io,
    () => O.none(),
    (a) => O.some(a)
  )
}

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(ma: IO<R, Option<E>, A>): IO<R, E, Option<A>> {
  return foldM_(
    ma,
    O.fold(() => pure(O.none()), fail),
    flow(O.some, pure)
  )
}

export function orDie<R, E extends Error, A>(ma: IO<R, E, A>): IO<R, never, A> {
  return orDieWith_(ma, identity)
}

export function orDieKeep<R, E extends Error, A>(ma: IO<R, E, A>): IO<R, unknown, A> {
  return foldCauseM_(ma, (ce) => halt(C.bind_(ce, (e) => C.die(e))), pure)
}

export function orDieWith_<R, E, A>(ma: IO<R, E, A>, f: (e: E) => Error): IO<R, never, A> {
  return foldM_(ma, (e) => die(f(e)), pure)
}

export function orDieWith<E>(f: (e: E) => Error): <R, A>(ma: IO<R, E, A>) => IO<R, never, A> {
  return (ma) => orDieWith_(ma, f)
}

export function orElse_<R, E, A, R1, E1, A1>(ma: IO<R, E, A>, that: () => IO<R1, E1, A1>): IO<R & R1, E1, A | A1> {
  return tryOrElse_(ma, that, pure)
}

export function orElse<R1, E1, A1>(that: () => IO<R1, E1, A1>): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1, A1 | A> {
  return (ma) => tryOrElse_(ma, that, pure)
}

export function orElseEither_<R, E, A, R1, E1, A1>(
  self: IO<R, E, A>,
  that: () => IO<R1, E1, A1>
): IO<R & R1, E1, E.Either<A, A1>> {
  return tryOrElse_(
    self,
    () => map_(that(), E.right),
    (a) => succeed(E.left(a))
  )
}

export function orElseEither<R1, E1, A1>(
  that: () => IO<R1, E1, A1>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1, E.Either<A, A1>> {
  return (ma) => orElseEither_(ma, that)
}

export function orElseFail_<R, E, A, E1>(ma: IO<R, E, A>, e: () => E1): IO<R, E1, A> {
  return orElse_(ma, () => fail(e()))
}

export function orElseFail<E1>(e: () => E1): <R, E, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => orElseFail_(fa, e)
}

export function orElseOption_<R, E, A, R1, E1, A1>(
  ma: IO<R, Option<E>, A>,
  that: () => IO<R1, Option<E1>, A1>
): IO<R & R1, Option<E | E1>, A | A1> {
  return catchAll_(
    ma,
    O.fold(that, (e) => fail(O.some<E | E1>(e)))
  )
}

export function orElseOption<R1, E1, A1>(
  that: () => IO<R1, Option<E1>, A1>
): <R, E, A>(ma: IO<R, Option<E>, A>) => IO<R & R1, Option<E1 | E>, A1 | A> {
  return (ma) => orElseOption_(ma, that)
}

export function orElseSucceed_<R, E, A, A1>(ma: IO<R, E, A>, a: () => A1): IO<R, E, A | A1> {
  return orElse_(ma, () => pure(a()))
}

export function orElseSucceed<A1>(a: () => A1): <R, E, A>(self: IO<R, E, A>) => IO<R, E, A1 | A> {
  return (self) => orElseSucceed_(self, a)
}

/**
 * Exposes all parallel errors in a single call
 */
export function parallelErrors<R, E, A>(io: IO<R, E, A>): IO<R, ReadonlyArray<E>, A> {
  return foldCauseM_(
    io,
    (cause) => {
      const f = C.failures(cause)

      if (f.length === 0) {
        return halt(cause as Cause<never>)
      } else {
        return fail(f)
      }
    },
    succeed
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in a separated fashion.
 */
export function partition_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, B>
): IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return map_(
    foreach_(as, (a) => attempt(f(a))),
    I.partitionMap(identity)
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in a separated fashion.
 */
export function partition<R, E, A, B>(
  f: (a: A) => IO<R, E, B>
): (fas: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (fas) => partition_(fas, f)
}

/**
 * Returns an IO that semantically runs the IO on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function result<R, E, A>(ma: IO<R, E, A>): IO<R, never, Exit<E, A>> {
  return new Fold(
    ma,
    (cause) => succeed(Ex.halt(cause)),
    (succ) => succeed(Ex.succeed(succ))
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E extends Error, A, E1>(fa: IO<R, E, A>, pf: (e: E) => Option<E1>): IO<R, E1, A> {
  return refineOrDieWith_(fa, pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E extends Error, E1>(pf: (e: E) => Option<E1>): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => refineOrDie_(fa, pf)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, A, E1>(
  fa: IO<R, E, A>,
  pf: (e: E) => Option<E1>,
  f: (e: E) => Error
): IO<R, E1, A> {
  return catchAll_(fa, (e) => O.fold_(pf(e), () => die(f(e)), fail))
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into an `Error`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option<E1>,
  f: (e: E) => Error
): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => refineOrDieWith_(fa, pf, f)
}

/**
 * ```haskell
 * reject_ :: (IO r e a, (a -> Option e1)) -> IO r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject_<R, E, A, E1>(fa: IO<R, E, A>, pf: (a: A) => Option<E1>): IO<R, E | E1, A> {
  return rejectM_(fa, (a) => O.map_(pf(a), fail))
}

/**
 * ```haskell
 * reject :: (a -> Option e1) -> IO r e a -> IO r (e | e1) a
 * ```
 *
 * Fail with the returned value if the partial function `pf` matches, otherwise
 * continue with the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>): <R, E>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
  return (fa) => reject_(fa, pf)
}

/**
 * ```haskell
 * rejectM_ :: (IO r e a, (a -> Option (IO r1 e1 e1))) -> IO (r & r1) (e | e1) a
 * ```
 *
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function rejectM_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  pf: (a: A) => Option<IO<R1, E1, E1>>
): IO<R & R1, E | E1, A> {
  return bind_(fa, (a) => O.fold_(pf(a), () => pure(a), bind(fail)))
}

/**
 * ```haskell
 * rejectM :: (a -> Option (IO r1 e1 e1)) -> IO r e a -> IO (r & r1) (e | e1) a
 * ```
 *
 * Continue with the returned computation if the partial function `pf` matches,
 * translating the successful match into a failure, otherwise continue with
 * the held value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function rejectM<R1, E1, A>(
  pf: (a: A) => Option<IO<R1, E1, E1>>
): <R, E>(fa: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (fa) => rejectM_(fa, pf)
}

/**
 * ```haskell
 * repeatN_ :: (IO r e a, Number) -> IO r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN_<R, E, A>(ma: IO<R, E, A>, n: number): IO<R, E, A> {
  return bind_(ma, (a) => (n <= 0 ? pure(a) : repeatN_(ma, n - 1)))
}

/**
 * ```haskell
 * repeatN :: Number -> IO r e a -> IO r e a
 * ```
 *
 * Repeats this effect the specified number of times.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function repeatN(n: number): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, A> {
  return (ma) => repeatN_(ma, n)
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil_<R, E, A>(ma: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatUntilM_(ma, (a) => pure(f(a)))
}

/**
 * Repeats this effect until its result satisfies the specified predicate.
 */
export function repeatUntil<A>(f: (a: A) => boolean): <R, E>(ma: IO<R, E, A>) => IO<R, E, A> {
  return (ma) => repeatUntil_(ma, f)
}

/**
 * Repeats this effect until its error satisfies the specified effectful predicate.
 */
export function repeatUntilM_<R, E, A, R1, E1>(
  ma: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return bind_(ma, (a) => bind_(f(a), (b) => (b ? pure(a) : repeatUntilM_(ma, f))))
}

/**
 * Repeats this effect until its result satisfies the specified effectful predicate.
 */
export function repeatUntilM<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ma) => repeatUntilM_(ma, f)
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile_<R, E, A>(ma: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatWhileM_(ma, (a) => pure(f(a)))
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile<A>(f: (a: A) => boolean): <R, E>(ma: IO<R, E, A>) => IO<R, E, A> {
  return (ma) => repeatWhile_(ma, f)
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM_<R, E, A, R1, E1>(
  ma: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return bind_(ma, (a) => bind_(f(a), (b) => (b ? repeatWhileM_(ma, f) : pure(a))))
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ma) => repeatWhileM_(ma, f)
}

export function replicate(n: number): <R, E, A>(ma: IO<R, E, A>) => readonly IO<R, E, A>[] {
  return (ma) => A.map_(A.range(0, n), () => ma)
}

export function require_<R, E, A>(ma: IO<R, E, O.Option<A>>, error: () => E): IO<R, E, A> {
  return bind_(
    ma,
    O.fold(() => bind_(effectTotal(error), fail), succeed)
  )
}

function _require<E>(error: () => E): <R, A>(ma: IO<R, E, O.Option<A>>) => IO<R, E, A> {
  return (ma) => require_(ma, error)
}

export { _require as require }

/**
 * Recover from the unchecked failure of the `IO`. (opposite of `orDie`)
 */
export function resurrect<R, E, A>(io: IO<R, E, A>): IO<R, unknown, A> {
  return unrefineWith_(io, O.some, identity)
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 */
export function retryUntil_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean): IO<R, E, A> {
  return retryUntilM_(fa, flow(f, pure))
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntil<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryUntil_(fa, f)
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntilM_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return catchAll_(fa, (e) => bind_(f(e), (b) => (b ? fail(e) : retryUntilM_(fa, f))))
}

/**
 * Retries this effect until its error satisfies the specified effectful predicate.
 */
export function retryUntilM<E, R1, E1>(
  f: (e: E) => IO<R1, E1, boolean>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => retryUntilM_(fa, f)
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export function retryWhile_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean) {
  return retryWhileM_(fa, flow(f, pure))
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export function retryWhile<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryWhile_(fa, f)
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export function retryWhileM_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return catchAll_(fa, (e) => bind_(f(e), (b) => (b ? retryWhileM_(fa, f) : fail(e))))
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export function retryWhileM<E, R1, E1>(
  f: (e: E) => IO<R1, E1, boolean>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => retryWhileM_(fa, f)
}

/**
 * Returns an IO that effectually "peeks" at the cause of the failure of
 * this IO.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function tapCause_<R2, A2, R, E, E2>(
  ma: IO<R2, E2, A2>,
  f: (e: Cause<E2>) => IO<R, E, any>
): IO<R2 & R, E | E2, A2> {
  return foldCauseM_(ma, (c) => bind_(f(c), () => halt(c)), succeed)
}

/**
 * Returns an IO that effectually "peeks" at the cause of the failure of
 * this IO.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function tapCause<R, E, E1>(
  f: (e: Cause<E1>) => IO<R, E, any>
): <R1, A1>(ma: IO<R1, E1, A1>) => IO<R1 & R, E | E1, A1> {
  return (ma) => tapCause_(ma, f)
}

/**
 * ```haskell
 * sandbox :: IO r e a -> IO r (Cause e) a
 * ```
 *
 * Exposes the full cause of failure of this effect.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const sandbox: <R, E, A>(fa: IO<R, E, A>) => IO<R, Cause<E>, A> = foldCauseM(fail, pure)

export function sandboxWith<R, E, A, E1>(
  f: (_: IO<R, Cause<E>, A>) => IO<R, Cause<E1>, A>
): (ma: IO<R, E, A>) => IO<R, E1, A> {
  return (ma) => unsandbox(f(sandbox(ma)))
}

export function summarized_<R, E, A, R1, E1, B, C>(
  self: IO<R, E, A>,
  summary: IO<R1, E1, B>,
  f: (start: B, end: B) => C
): IO<R & R1, E | E1, readonly [C, A]> {
  return gen(function* (_) {
    const start = yield* _(summary)
    const value = yield* _(self)
    const end   = yield* _(summary)
    return tuple(f(start, end), value)
  })
}

export function summarized<R1, E1, B, C>(
  summary: IO<R1, E1, B>,
  f: (start: B, end: B) => C
): <R, E, A>(self: IO<R, E, A>) => IO<R & R1, E1 | E, readonly [C, A]> {
  return (self) => summarized_(self, summary, f)
}

/**
 * ```haskell
 * swap :: Bifunctor p => p a b -> p b a
 * ```
 *
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category AltBifunctor?
 * @since 1.0.0
 */
export function swap<R, E, A>(pab: IO<R, E, A>): IO<R, A, E> {
  return foldM_(pab, pure, fail)
}

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 */
export function swapWith_<R, E, A, R1, E1, A1>(fa: IO<R, E, A>, f: (ma: IO<R, A, E>) => IO<R1, A1, E1>) {
  return swap(f(swap(fa)))
}

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 */
export function swapWith<R, E, A, R1, E1, A1>(
  f: (ma: IO<R, A, E>) => IO<R1, A1, E1>
): (fa: IO<R, E, A>) => IO<R1, E1, A1> {
  return (fa) => swapWith_(fa, f)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith_<R, E, A, R1, E1>(ma: IO<R, E, A>, msTime: IO<R1, E1, number>) {
  return summarized_(ma, msTime, (start, end) => end - start)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith<R1, E1>(
  msTime: IO<R1, E1, number>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, readonly [number, A]> {
  return (ma) => timedWith_(ma, msTime)
}

export function tryOrElse_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  that: () => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Fold(ma, (cause) => O.fold_(C.keepDefects(cause), that, halt), onSuccess)
}

export function tryOrElse<A, R1, E1, A1, R2, E2, A2>(
  that: () => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => tryOrElse_(ma, that, onSuccess)
}

/**
 * When this IO succeeds with a cause, then this method returns a new
 * IO that either fails with the cause that this IO succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 */
export function uncause<R, E>(ma: IO<R, never, C.Cause<E>>): IO<R, E, void> {
  return bind_(ma, (a) => (C.isEmpty(a) ? unit() : halt(a)))
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefine_<R, E, A, E1>(fa: IO<R, E, A>, pf: (u: Error) => Option<E1>) {
  return unrefineWith_(fa, pf, identity)
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefine<E1>(pf: (u: unknown) => Option<E1>): <R, E, A>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
  return (fa) => unrefine_(fa, pf)
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefineWith_<R, E, A, E1, E2>(
  fa: IO<R, E, A>,
  pf: (u: Error) => Option<E1>,
  f: (e: E) => E2
): IO<R, E1 | E2, A> {
  return catchAllCause_(
    fa,
    (cause): IO<R, E1 | E2, A> =>
      pipe(
        cause,
        C.find((c) => (C.died(c) ? pf(c.value) : O.none())),
        O.fold(() => pipe(cause, C.map(f), halt), fail)
      )
  )
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefineWith<E1>(
  fa: (u: unknown) => Option<E1>
): <E, E2>(f: (e: E) => E2) => <R, A>(ma: IO<R, E, A>) => IO<R, E1 | E2, A> {
  return (f) => (ma) => unrefineWith_(ma, fa, f)
}

/**
 * ```haskell
 * unsandbox :: IO r (Cause e) a -> IO r e a
 * ```
 *
 * The inverse operation `sandbox`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const unsandbox: <R, E, A>(ma: IO<R, Cause<E>, A>) => IO<R, E, A> = mapErrorCause(C.flatten)

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM_<R, E, A, R1, E1>(ma: IO<R, E, A>, mb: IO<R1, E1, boolean>) {
  return bind_(mb, (a) => (a ? asUnit(ma) : unit()))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM<R, E>(mb: IO<R, E, boolean>): <R1, E1, A>(ma: IO<R1, E1, A>) => IO<R & R1, E | E1, void> {
  return (ma) => whenM_(ma, mb)
}

export function when_<R, E, A>(ma: IO<R, E, A>, b: () => boolean) {
  return whenM_(ma, effectTotal(b))
}

export function when(b: () => boolean): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, void> {
  return (ma) => when_(ma, b)
}

export function zipEnvFirst<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [R, A]> {
  return cross_(ask<R>(), io)
}

export function zipEnvSecond<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [A, R]> {
  return cross_(io, ask<R>())
}

/*
 * -------------------------------------------
 * Service
 * -------------------------------------------
 */

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => IO<R, E, B>
) => IO<
  R & UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  E,
  B
> {
  return (f) =>
    asksM((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export function asksServicesTM<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => IO<R, E, B>
) => IO<
  R & UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
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

export function asksServicesT<SS extends Tag<any>[]>(
  ...s: SS
): <B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => URIO<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
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
) => URIO<UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>, B> {
  return (f) =>
    asks((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceM<T>(s: Tag<T>): <R, E, B>(f: (a: T) => IO<R, E, B>) => IO<R & Has<T>, E, B> {
  return (f) => asksM((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceF<T>(
  s: Tag<T>
): <K extends keyof T & { [k in keyof T]: T[k] extends (...args: any[]) => IO<any, any, any> ? k : never }[keyof T]>(
  k: K
) => (
  ...args: T[K] extends (...args: infer ARGS) => IO<any, any, any> ? ARGS : unknown[]
) => T[K] extends (...args: any[]) => IO<infer R, infer E, infer A> ? IO<R & Has<T>, E, A> : unknown[] {
  return (k) => (...args) => asksServiceM(s)((t) => (t[k] as any)(...args)) as any
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => IO<Has<T>, never, B> {
  return (f) => asksServiceM(s)((a) => pure(f(a)))
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): IO<Has<T>, never, T> {
  return asksServiceM(s)((a) => pure(a))
}

/**
 * Provides the service with the required Service Entry
 */
export function giveServiceM<T>(_: Tag<T>) {
  return <R, E>(f: IO<R, E, T>) => <R1, E1, A1>(ma: IO<R1 & Has<T>, E1, A1>): IO<R & R1, E | E1, A1> =>
    asksM((r: R & R1) => bind_(f, (t) => giveAll_(ma, mergeEnvironments(_, r, t))))
}

/**
 * Provides the service with the required Service Entry
 */
export function giveService<T>(_: Tag<T>): (f: T) => <R1, E1, A1>(ma: IO<R1 & Has<T>, E1, A1>) => IO<R1, E1, A1> {
  return (f) => (ma) => giveServiceM(_)(pure(f))(ma)
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateServiceM<R, E, T>(
  _: Tag<T>,
  f: (_: T) => IO<R, E, T>
): <R1, E1, A1>(ma: IO<R1 & Has<T>, E1, A1>) => IO<R & R1 & Has<T>, E1 | E, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateServiceM_<R, E, T, R1, E1, A1>(
  ma: IO<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => IO<R, E, T>
): IO<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: IO<R1 & Has<T>, E1, A1>) => IO<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(pure(f(t)))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateService_<R1, E1, A1, T>(
  ma: IO<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): IO<R1 & Has<T>, E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(pure(f(t)))(ma))
}

/**
 * Defines a new region tag
 */
export function region<K, T>(): Tag<Region<T, K>> {
  return tag<Region<T, K>>()
}

/**
 * Uses the region to provide
 */
export function useRegion<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: IO<R & T, E, A>) => IO<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(e, give((a as any) as T)))
}

/**
 * Access the region monadically
 */
export function asksRegionM<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: (_: T) => IO<R & T, E, A>) => IO<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(asksM(e), give((a as any) as T)))
}

/**
 * Access the region
 */
export function asksRegion<K, T>(h: Tag<Region<T, K>>): <A>(e: (_: T) => A) => IO<Has<Region<T, K>>, never, A> {
  return (e) => asksServiceM(h)((a) => pipe(asks(e), give((a as any) as T)))
}

/**
 * Read the region value
 */
export function askRegion<K, T>(h: Tag<Region<T, K>>): IO<Has<Region<T, K>>, never, T> {
  return asksServiceM(h)((a) =>
    pipe(
      asks((r: T) => r),
      give((a as any) as T)
    )
  )
}

/**
 * Reads service inside region
 */
export function askServiceIn<A>(
  _: Tag<A>
): <K, T>(h: Tag<Region<Has<A> & T, K>>) => IO<Has<Region<Has<A> & T, K>>, never, A> {
  return (h) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          asks((r: A) => r),
          give((a as any) as A)
        )
      )
    )
}

/**
 * Access service inside region
 */
export function asksServiceIn<A>(
  _: Tag<A>
): <K, T>(h: Tag<Region<Has<A> & T, K>>) => <B>(f: (_: A) => B) => IO<Has<Region<Has<A> & T, K>>, never, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          asks((r: A) => f(r)),
          give((a as any) as A)
        )
      )
    )
}

/**
 * Reads service inside region monadically
 */
export function asksServiceInM<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <R, E, B>(f: (_: A) => IO<R, E, B>) => IO<R & Has<Region<Has<A> & T, K>>, E, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          asksM((r: A) => f(r)),
          give((a as any) as A)
        )
      )
    )
}

/**
 * ```haskell
 * asService :: Tag a -> IO r e a -> IO r e (Has a)
 * ```
 *
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>): <R, E>(fa: IO<R, E, A>) => IO<R, E, Has<A>> {
  return (fa) => map_(fa, has.of)
}

/*
 * -------------------------------------------
 * Gen
 * -------------------------------------------
 */

export class GenIO<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly T: IO<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenIO<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (E.isEither(_)) {
    return new GenIO(fromEither(() => _))
  }
  if (O.isOption(_)) {
    return new GenIO(__ ? (_._tag === 'None' ? fail(__()) : pure(_.value)) : getOrFail(() => _))
  }
  if (isTag(_)) {
    return new GenIO(askService(_))
  }
  if (isSync(_)) {
    return new GenIO(fromSync(_))
  }
  return new GenIO(_)
}

export function gen<R0, E0, A0>(): <T extends GenIO<R0, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenIO<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenIO<unknown, E, A>
    <A>(_: Option<A>): GenIO<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenIO<unknown, E, A>
    <R, E, A>(_: IO<R, E, A>): GenIO<R, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenIO<R, E, A>
  }) => Generator<T, A0, any>
) => IO<InferR<T>, InferE<T>, A0>
export function gen<E0, A0>(): <T extends GenIO<any, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenIO<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenIO<unknown, E, A>
    <A>(_: Option<A>): GenIO<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenIO<unknown, E, A>
    <R, E, A>(_: IO<R, E, A>): GenIO<R, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenIO<R, E, A>
  }) => Generator<T, A0, any>
) => IO<InferR<T>, InferE<T>, A0>
export function gen<A0>(): <T extends GenIO<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenIO<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenIO<unknown, E, A>
    <A>(_: Option<A>): GenIO<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenIO<unknown, E, A>
    <R, E, A>(_: IO<R, E, A>): GenIO<R, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenIO<R, E, A>
  }) => Generator<T, A0, any>
) => IO<InferR<T>, InferE<T>, A0>
export function gen<T extends GenIO<any, any, any>, A>(
  f: (i: {
    <A>(_: Tag<A>): GenIO<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenIO<unknown, E, A>
    <A>(_: Option<A>): GenIO<unknown, NoSuchElementException, A>
    <E, A>(_: E.Either<E, A>): GenIO<unknown, E, A>
    <R, E, A>(_: IO<R, E, A>): GenIO<R, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenIO<R, E, A>
  }) => Generator<T, A, any>
): IO<InferR<T>, InferE<T>, A>
export function gen(...args: any[]): any {
  const _gen = <T extends GenIO<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): IO<InferR<T>, InferE<T>, A> =>
    deferTotal(() => {
      const iterator = f(adapter as any)
      const state    = iterator.next()

      const run = (state: IteratorYieldResult<T> | IteratorReturnResult<A>): IO<any, any, A> => {
        if (state.done) {
          return pure(state.value)
        }
        return bind_(state.value.T, (val) => {
          const next = iterator.next(val)
          return run(next)
        })
      }

      return run(state)
    })
  if (args.length === 0) {
    return (f: any) => _gen(f)
  }
  return _gen(args[0])
}

/*
 * -------------------------------------------
 * Derive
 * -------------------------------------------
 */

export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (...args: infer ARGS) => IO<infer R, infer E, infer A>
      ? ((...args: ARGS) => IO<R, E, A>) extends T[k]
        ? k
        : never
      : never
  }[keyof T]
>

export type ShapeCn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends IO<any, any, any> ? k : never
  }[keyof T]
>

export type ShapePu<T> = Omit<
  T,
  | {
      [k in keyof T]: T[k] extends (...args: any[]) => any ? k : never
    }[keyof T]
  | {
      [k in keyof T]: T[k] extends IO<any, any, any> ? k : never
    }[keyof T]
>

export type DerivedLifted<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof ShapePu<T>
> = {
  [k in Fns]: T[k] extends (...args: infer ARGS) => IO<infer R, infer E, infer A>
    ? (...args: ARGS) => IO<R & Has<T>, E, A>
    : never
} &
  {
    [k in Cns]: T[k] extends IO<infer R, infer E, infer A> ? IO<R & Has<T>, E, A> : never
  } &
  {
    [k in Values]: IO<Has<T>, never, T[k]>
  }

export function deriveLifted<T>(
  H: Tag<T>
): <
  Fns extends keyof ShapeFn<T> = never,
  Cns extends keyof ShapeCn<T> = never,
  Values extends keyof ShapePu<T> = never
>(
  functions: Fns[],
  constants: Cns[],
  values: Values[]
) => DerivedLifted<T, Fns, Cns, Values> {
  return (functions, constants, values) => {
    const mut_ret = {} as any

    for (const k of functions) {
      mut_ret[k] = (...args: any[]) => asksServiceM(H)((h) => h[k](...args))
    }

    for (const k of constants) {
      mut_ret[k] = asksServiceM(H)((h) => h[k])
    }

    for (const k of values) {
      mut_ret[k] = asksService(H)((h) => h[k])
    }

    return mut_ret as any
  }
}

export type DerivedAccessM<T, Gens extends keyof T> = {
  [k in Gens]: <R_, E_, A_>(f: (_: T[k]) => IO<R_, E_, A_>) => IO<R_ & Has<T>, E_, A_>
}

export function deriveAsksM<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccessM<T, Gens> {
  return (generics) => {
    const mut_ret = {} as any

    for (const k of generics) {
      mut_ret[k] = (f: any) => asksServiceM(H)((h) => f(h[k]))
    }

    return mut_ret as any
  }
}

export type DerivedAccess<T, Gens extends keyof T> = {
  [k in Gens]: <A_>(f: (_: T[k]) => A_) => IO<Has<T>, never, A_>
}

export function deriveAsks<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccess<T, Gens> {
  return (generics) => {
    const mut_ret = {} as any

    for (const k of generics) {
      mut_ret[k] = (f: any) => asksService(H)((h) => f(h[k]))
    }

    return mut_ret as any
  }
}
