import * as E from "../../../Either";
import { flow } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as Fiber from "../../Fiber";
import type { IO, RIO } from "../_core";
import { asks, async, chain_, die, fail, pure, total } from "../_core";
import type { EIO, Task } from "../model";
import { asksM } from "../reader";

/**
 * Creates a `Task` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): EIO<E, A> {
  return chain_(total(fiber), Fiber.join);
}

/**
 * Creates a `Task` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiberM<R, E, A, E1>(fiber: Task<R, E, Fiber.Fiber<E1, A>>): Task<R, E | E1, A> {
  return chain_(fiber, Fiber.join);
}

/**
 * Lifts an `Either` into an `Task`
 */
export function fromEither<E, A>(f: () => E.Either<E, A>): Task<unknown, E, A> {
  return chain_(total(f), E.fold(fail, pure));
}

/**
 * Lifts an `Option` into a `Task` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromOption<A>(m: () => Option<A>): EIO<Option<never>, A> {
  return chain_(total(m), (ma) => (ma._tag === "None" ? fail(O.none()) : pure(ma.value)));
}

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith_<E, A>(
  promise: () => Promise<A>,
  onReject: (reason: unknown) => E
): EIO<E, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(onReject, fail, resolve));
  });
}

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith<E>(
  onReject: (reason: unknown) => E
): <A>(promise: () => Promise<A>) => EIO<E, A> {
  return (promise) => fromPromiseWith_(promise, onReject);
}

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export function fromPromise<A>(promise: () => Promise<A>): EIO<unknown, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(fail, resolve));
  });
}

/**
 * Like fromPromise but produces a defect in case of errors
 */
export function fromPromiseDie<A>(promise: () => Promise<A>): IO<A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(die, resolve));
  });
}

/**
 * Creates a `Task` from a non-throwing function
 */
export function fromFunction<R, A>(f: (r: R) => A): RIO<R, A> {
  return asks(f);
}

/**
 * Creates a `Task` from a Task-returning function
 */
export function fromFunctionM<R, E, A>(f: (r: R) => EIO<E, A>): Task<R, E, A> {
  return asksM(f);
}
