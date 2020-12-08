import { makeMonoid } from "@principia/prelude";

import * as A from "../../Array/_core";
import type { FreeMonoid } from "../../FreeMonoid";
import * as FS from "../../FreeMonoid";
import * as I from "../../Iterable";
import * as O from "../../Option";
import { some } from "../../Option";
import { zipWith_ } from "../apply-seq";
import { mapError } from "../bifunctor";
import type { Cause } from "../Cause";
import * as C from "../Cause";
import { halt, succeed, suspend, total } from "../constructors";
import * as Ex from "../Exit/_core";
import type { Exit } from "../Exit/model";
import type { FailureReporter } from "../Fiber/_internal/io";
import type { Executor } from "../Fiber/executor";
import type { FiberDescriptor, InterruptStatus } from "../Fiber/model";
import type { Trace } from "../Fiber/tracing";
import { foldCauseM_, foldM_ } from "../fold";
import { map_ } from "../functor";
import type { IO, UIO, URIO } from "../model";
import {
  CheckDescriptorInstruction,
  FoldInstruction,
  ForkInstruction,
  GetInterruptInstruction,
  GetTracingStatusInstruction,
  SetTracingStatusInstruction,
  TraceInstruction
} from "../model";
import { chain_ } from "../monad";
import { unit } from "../unit";

/*
 * -------------------------------------------
 * Core IO Combinators
 * -------------------------------------------
 */

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<R, E, A, R1, E1, A1>(
  ma: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, A1>
): IO<R & R1, E1, A | A1> {
  return foldM_(ma, f, (x) => succeed(x));
}

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll<R, E, E2, A>(
  f: (e: E2) => IO<R, E, A>
): <R2, A2>(ma: IO<R2, E2, A2>) => IO<R2 & R, E, A | A2> {
  return (ma) => catchAll_(ma, f);
}

/**
 * When this IO succeeds with a cause, then this method returns a new
 * IO that either fails with the cause that this IO succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 */
export function uncause<R, E>(ma: IO<R, never, C.Cause<E>>): IO<R, E, void> {
  return chain_(ma, (a) => (C.isEmpty(a) ? unit() : halt(a)));
}

/**
 * Ignores the result of the IO, replacing it with unit
 *
 * @category Combinators
 * @since 1.0.0
 */
export function asUnit<R, E>(ma: IO<R, E, any>): IO<R, E, void> {
  return chain_(ma, () => unit());
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
  return map_(ma, () => b());
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
 */
export function as<B>(b: () => B): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, B> {
  return (ma) => as_(ma, b);
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
export const asSomeError: <R, E, A>(ma: IO<R, E, A>) => IO<R, O.Option<E>, A> = mapError(some);

export function cause<R, E, A>(ma: IO<R, E, A>): IO<R, never, Cause<E>> {
  return foldCauseM_(ma, succeed, () => succeed(C.empty));
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
  return chain_(mb, (x) => (x ? (onTrue() as IO<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()));
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
  return (b) => ifM_(b, onTrue, onFalse);
}

export function if_<R, E, A, R1, E1, A1>(
  b: () => boolean,
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return ifM_(total(b), onTrue, onFalse);
}

function _if<R, E, A, R1, E1, A1>(
  onTrue: () => IO<R, E, A>,
  onFalse: () => IO<R1, E1, A1>
): (b: () => boolean) => IO<R & R1, E | E1, A | A1> {
  return (b) => if_(b, onTrue, onFalse);
}
export { _if as if };

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
  return I.foldMap(makeMonoid<IO<R, E, void>>((x, y) => chain_(x, () => y), unit()))(f)(as);
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
export function foreachUnit<R, E, A>(
  f: (a: A) => IO<R, E, any>
): (as: Iterable<A>) => IO<R, E, void> {
  return (as) => foreachUnit_(as, f);
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
export function foreach_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, B>
): IO<R, E, ReadonlyArray<B>> {
  return map_(
    I.reduce_(as, succeed(FS.empty<B>()) as IO<R, E, FreeMonoid<B>>, (b, a) =>
      zipWith_(
        b,
        suspend(() => f(a)),
        (acc, r) => FS.append_(acc, r)
      )
    ),
    FS.toArray
  );
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
export function foreach<R, E, A, B>(
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f);
}

/**
 * Returns an IO that semantically runs the IO on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function result<R, E, A>(ma: IO<R, E, A>): IO<R, never, Exit<E, A>> {
  return new FoldInstruction(
    ma,
    (cause) => succeed(Ex.failure(cause)),
    (succ) => succeed(Ex.succeed(succ))
  );
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduce_<A, B, R, E>(
  as: Iterable<A>,
  b: B,
  f: (b: B, a: A) => IO<R, E, B>
): IO<R, E, B> {
  return A.reduce_(Array.from(as), succeed(b) as IO<R, E, B>, (acc, el) =>
    chain_(acc, (a) => f(a, el))
  );
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduce<R, E, A, B>(
  b: B,
  f: (b: B, a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, E, B> {
  return (as) => reduce_(as, b, f);
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduceRight_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => IO<R, E, Z>
): IO<R, E, Z> {
  return A.reduceRight_(Array.from(i), succeed(zero) as IO<R, E, Z>, (el, acc) =>
    chain_(acc, (a) => f(el, a))
  );
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from right to left.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reduceRight<A, Z, R, E>(
  zero: Z,
  f: (a: A, z: Z) => IO<R, E, Z>
): (i: Iterable<A>) => IO<R, E, Z> {
  return (i) => reduceRight_(i, zero, f);
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM_<R, E, A, R1, E1>(ma: IO<R, E, A>, mb: IO<R1, E1, boolean>) {
  return chain_(mb, (a) => (a ? asUnit(ma) : unit()));
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM<R, E>(
  mb: IO<R, E, boolean>
): <R1, E1, A>(ma: IO<R1, E1, A>) => IO<R & R1, E | E1, void> {
  return (ma) => whenM_(ma, mb);
}

export function when_<R, E, A>(ma: IO<R, E, A>, b: () => boolean) {
  return whenM_(ma, total(b));
}

export function when(b: () => boolean): <R, E, A>(ma: IO<R, E, A>) => IO<R, E, void> {
  return (ma) => when_(ma, b);
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
  return foldCauseM_(ma, (c) => chain_(f(c), () => halt(c)), succeed);
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
  return (ma) => tapCause_(ma, f);
}

/**
 * Constructs an IO based on information about the current fiber, such as
 * its identity.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function descriptorWith<R, E, A>(f: (d: FiberDescriptor) => IO<R, E, A>): IO<R, E, A> {
  return new CheckDescriptorInstruction(f);
}

/**
 * Returns information about the current fiber, such as its identity.
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function descriptor(): IO<unknown, never, FiberDescriptor> {
  return descriptorWith(succeed);
}

/**
 * Checks the interrupt status, and produces the IO returned by the
 * specified callback.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function checkInterruptible<R, E, A>(f: (i: InterruptStatus) => IO<R, E, A>): IO<R, E, A> {
  return new GetInterruptInstruction(f);
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
export function fork<R, E, A>(ma: IO<R, E, A>): URIO<R, Executor<E, A>> {
  return new ForkInstruction(ma, O.none(), O.none());
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
export function forkReport(
  reportFailure: FailureReporter
): <R, E, A>(ma: IO<R, E, A>) => URIO<R, Executor<E, A>> {
  return (ma) => new ForkInstruction(ma, O.none(), O.some(reportFailure));
}

/**
 * Enables effect tracing for this IO. Because this is the default, this
 * operation only has an additional meaning if the effect is located within
 * an `untraced` section, or the current fiber has been spawned by a parent
 * inside an `untraced` section.
 */
export function traced<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  return new SetTracingStatusInstruction(ma, true);
}

/**
 * Disables effect tracing facilities for the duration of the IO.
 *
 * Note: Effect tracing is cached, as such after the first iteration
 * it has a negligible effect on performance of hot-spots (Additional
 * hash map lookup per flatMap). As such, using `untraced` sections
 * is not guaranteed to result in a noticeable performance increase.
 */
export function untraced<R, E, A>(self: IO<R, E, A>): IO<R, E, A> {
  return new SetTracingStatusInstruction(self, false);
}

/**
 * Capture trace at the current point
 */
export const trace: UIO<Trace> = new TraceInstruction();

/**
 * Checks the tracing status, and produces the effect returned by the
 * specified callback.
 */
export function checkTraced<R, E, A>(f: (_: boolean) => IO<R, E, A>): IO<R, E, A> {
  return new GetTracingStatusInstruction(f);
}
