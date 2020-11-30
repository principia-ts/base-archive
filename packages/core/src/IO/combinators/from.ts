import * as E from "../../Either";
import { flow } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type { UIO, URIO } from "../_core";
import { asks, async, chain_, die, fail, pure, total } from "../_core";
import * as Fiber from "../Fiber";
import type { FIO, IO } from "../model";
import { asksM } from "../reader";

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): FIO<E, A> {
  return chain_(total(fiber), Fiber.join);
}

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiberM<R, E, A, E1>(fiber: IO<R, E, Fiber.Fiber<E1, A>>): IO<R, E | E1, A> {
  return chain_(fiber, Fiber.join);
}

/**
 * Lifts an `Either` into an `IO`
 */
export function fromEither<E, A>(f: () => E.Either<E, A>): IO<unknown, E, A> {
  return chain_(total(f), E.fold(fail, pure));
}

/**
 * Lifts an `Option` into an `IO` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromOption<A>(m: () => Option<A>): FIO<Option<never>, A> {
  return chain_(total(m), (ma) => (ma._tag === "None" ? fail(O.none()) : pure(ma.value)));
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith_<E, A>(
  promise: () => Promise<A>,
  onReject: (reason: unknown) => E
): FIO<E, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(onReject, fail, resolve));
  });
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith<E>(
  onReject: (reason: unknown) => E
): <A>(promise: () => Promise<A>) => FIO<E, A> {
  return (promise) => fromPromiseWith_(promise, onReject);
}

/**
 * Create an IO that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export function fromPromise<A>(promise: () => Promise<A>): FIO<unknown, A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(fail, resolve));
  });
}

/**
 * Like fromPromise but produces a defect in case of errors
 */
export function fromPromiseDie<A>(promise: () => Promise<A>): UIO<A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(die, resolve));
  });
}

/**
 * Creates a `IO` from a non-throwing function
 */
export function fromFunction<R, A>(f: (r: R) => A): URIO<R, A> {
  return asks(f);
}

/**
 * Creates a `IO` from an IO-returning function
 */
export function fromFunctionM<R, E, A>(f: (r: R) => FIO<E, A>): IO<R, E, A> {
  return asksM(f);
}
