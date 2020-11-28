import { makeMonoid } from "@principia/prelude";

import * as A from "../../../Array/_core";
import type { FreeMonoid } from "../../../FreeMonoid";
import * as FS from "../../../FreeMonoid";
import * as I from "../../../Iterable";
import * as O from "../../../Option";
import { some } from "../../../Option";
import * as Ex from "../../Exit/_core";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import type { Exit } from "../../Exit/model";
import type { Executor } from "../../Fiber/executor";
import type { FiberDescriptor, InterruptStatus } from "../../Fiber/model";
import { zipWith_ } from "../apply-seq";
import { mapError } from "../bifunctor";
import { halt, succeed, suspend, total } from "../constructors";
import { foldCauseM_, foldM_ } from "../fold";
import { map_ } from "../functor";
import type { RIO, Task } from "../model";
import {
  CheckDescriptorInstruction,
  FoldInstruction,
  ForkInstruction,
  GetInterruptInstruction
} from "../model";
import { chain_ } from "../monad";
import { unit } from "../unit";

/*
 * -------------------------------------------
 * Core Task Combinators
 * -------------------------------------------
 */

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll_<R, E, A, R1, E1, A1>(
  ma: Task<R, E, A>,
  f: (e: E) => Task<R1, E1, A1>
): Task<R & R1, E1, A | A1> {
  return foldM_(ma, f, (x) => succeed(x));
}

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export function catchAll<R, E, E2, A>(
  f: (e: E2) => Task<R, E, A>
): <R2, A2>(ma: Task<R2, E2, A2>) => Task<R2 & R, E, A | A2> {
  return (ma) => catchAll_(ma, f);
}

/**
 * When this task succeeds with a cause, then this method returns a new
 * task that either fails with the cause that this task succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 */
export function uncause<R, E>(ma: Task<R, never, C.Cause<E>>): Task<R, E, void> {
  return chain_(ma, (a) => (C.isEmpty(a) ? unit() : halt(a)));
}

/**
 * Ignores the result of the task, replacing it with unit
 *
 * @category Combinators
 * @since 1.0.0
 */
export function asUnit<R, E>(ma: Task<R, E, any>): Task<R, E, void> {
  return chain_(ma, () => unit());
}

/**
 * ```haskell
 * as_ :: (Task r e a, b) -> Task r e b
 * ```
 *
 * Maps the success value of this task to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function as_<R, E, A, B>(ma: Task<R, E, A>, b: () => B): Task<R, E, B> {
  return map_(ma, () => b());
}

/**
 * ```haskell
 * as :: b -> Task r e a -> Task r e b
 * ```
 *
 * Maps the success value of this task to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function as<B>(b: () => B): <R, E, A>(ma: Task<R, E, A>) => Task<R, E, B> {
  return (ma) => as_(ma, b);
}

/**
 * ```haskell
 * asSomeError :: Task r e a -> Task r (Option e) a
 * ```
 *
 * Maps the error value of this task to an optional value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const asSomeError: <R, E, A>(ma: Task<R, E, A>) => Task<R, O.Option<E>, A> = mapError(some);

export function cause<R, E, A>(ma: Task<R, E, A>): Task<R, never, Cause<E>> {
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
  mb: Task<R, E, boolean>,
  onTrue: () => Task<R1, E1, A1>,
  onFalse: () => Task<R2, E2, A2>
): Task<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return chain_(mb, (x) => (x ? (onTrue() as Task<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()));
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
  onTrue: () => Task<R1, E1, A1>,
  onFalse: () => Task<R2, E2, A2>
): <R, E>(b: Task<R, E, boolean>) => Task<R & R1 & R2, E | E1 | E2, A1 | A2> {
  return (b) => ifM_(b, onTrue, onFalse);
}

export function if_<R, E, A, R1, E1, A1>(
  b: () => boolean,
  onTrue: () => Task<R, E, A>,
  onFalse: () => Task<R1, E1, A1>
): Task<R & R1, E | E1, A | A1> {
  return ifM_(total(b), onTrue, onFalse);
}

function _if<R, E, A, R1, E1, A1>(
  onTrue: () => Task<R, E, A>,
  onFalse: () => Task<R1, E1, A1>
): (b: () => boolean) => Task<R & R1, E | E1, A | A1> {
  return (b) => if_(b, onTrue, onFalse);
}
export { _if as if };

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced tasks sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreachUnit_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Task<R, E, any>
): Task<R, E, void> {
  return I.foldMap(makeMonoid<Task<R, E, void>>((x, y) => chain_(x, () => y), unit()))(f)(as);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced tasks sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foreachUnit<R, E, A>(
  f: (a: A) => Task<R, E, any>
): (as: Iterable<A>) => Task<R, E, void> {
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
  f: (a: A) => Task<R, E, B>
): Task<R, E, ReadonlyArray<B>> {
  return map_(
    I.reduce_(as, succeed(FS.empty<B>()) as Task<R, E, FreeMonoid<B>>, (b, a) =>
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
  f: (a: A) => Task<R, E, B>
): (as: Iterable<A>) => Task<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f);
}

/**
 * Returns an task that semantically runs the task on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function result<R, E, A>(ma: Task<R, E, A>): Task<R, never, Exit<E, A>> {
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
  f: (b: B, a: A) => Task<R, E, B>
): Task<R, E, B> {
  return A.reduce_(Array.from(as), succeed(b) as Task<R, E, B>, (acc, el) =>
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
  f: (b: B, a: A) => Task<R, E, B>
): (as: Iterable<A>) => Task<R, E, B> {
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
  f: (a: A, z: Z) => Task<R, E, Z>
): Task<R, E, Z> {
  return A.reduceRight_(Array.from(i), succeed(zero) as Task<R, E, Z>, (el, acc) =>
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
  f: (a: A, z: Z) => Task<R, E, Z>
): (i: Iterable<A>) => Task<R, E, Z> {
  return (i) => reduceRight_(i, zero, f);
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM_<R, E, A, R1, E1>(ma: Task<R, E, A>, mb: Task<R1, E1, boolean>) {
  return chain_(mb, (a) => (a ? asUnit(ma) : unit()));
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function whenM<R, E>(
  mb: Task<R, E, boolean>
): <R1, E1, A>(ma: Task<R1, E1, A>) => Task<R & R1, E | E1, void> {
  return (ma) => whenM_(ma, mb);
}

export function when_<R, E, A>(ma: Task<R, E, A>, b: () => boolean) {
  return whenM_(ma, total(b));
}

export function when(b: () => boolean): <R, E, A>(ma: Task<R, E, A>) => Task<R, E, void> {
  return (ma) => when_(ma, b);
}

/**
 * Returns a task that effectually "peeks" at the cause of the failure of
 * this task.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function tapCause_<R2, A2, R, E, E2>(
  ma: Task<R2, E2, A2>,
  f: (e: Cause<E2>) => Task<R, E, any>
): Task<R2 & R, E | E2, A2> {
  return foldCauseM_(ma, (c) => chain_(f(c), () => halt(c)), succeed);
}

/**
 * Returns a task that effectually "peeks" at the cause of the failure of
 * this task.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function tapCause<R, E, E1>(
  f: (e: Cause<E1>) => Task<R, E, any>
): <R1, A1>(ma: Task<R1, E1, A1>) => Task<R1 & R, E | E1, A1> {
  return (ma) => tapCause_(ma, f);
}

/**
 * Constructs a task based on information about the current fiber, such as
 * its identity.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function descriptorWith<R, E, A>(f: (d: FiberDescriptor) => Task<R, E, A>): Task<R, E, A> {
  return new CheckDescriptorInstruction(f);
}

/**
 * Returns information about the current fiber, such as its identity.
 *
 * @category Combinators,
 * @since 1.0.0
 */
export function descriptor(): Task<unknown, never, FiberDescriptor> {
  return descriptorWith(succeed);
}

/**
 * Checks the interrupt status, and produces the task returned by the
 * specified callback.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function checkInterruptible<R, E, A>(
  f: (i: InterruptStatus) => Task<R, E, A>
): Task<R, E, A> {
  return new GetInterruptInstruction(f);
}

/**
 * Returns a task that forks this task into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the task.
 *
 * You can use the `fork` method whenever you want to execute a task in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * tasks. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods interrupt the fiber and to
 * wait for it to finish executing the task. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn`
 * methods.
 */
export function fork<R, E, A>(ma: Task<R, E, A>): RIO<R, Executor<E, A>> {
  return new ForkInstruction(ma, O.none());
}
