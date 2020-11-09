import type { IO, RIO } from "../_core";
import { asks, async, chain_, die, fail, pure, total } from "../_core";
import * as E from "../../../Either";
import { flow } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as Fiber from "../../Fiber";
import type { EIO, Task } from "../model";
import { asksM } from "../reader";

/**
 * Creates a `Task` value that represents the exit value of the specified
 * fiber.
 */
export const fromFiber = <E, A>(fiber: () => Fiber.Fiber<E, A>): EIO<E, A> => chain_(total(fiber), Fiber.join);

/**
 * Creates a `Task` value that represents the exit value of the specified
 * fiber.
 */
export const fromFiberM = <R, E, A, E1>(fiber: Task<R, E, Fiber.Fiber<E1, A>>): Task<R, E | E1, A> =>
   chain_(fiber, Fiber.join);

/**
 * Lifts an `Either` into an `Task`
 */
export const fromEither = <E, A>(f: () => E.Either<E, A>) => chain_(total(f), E.fold(fail, pure));

/**
 * Lifts an `Option` into a `Task` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export const fromOption = <A>(m: () => Option<A>): EIO<Option<never>, A> =>
   chain_(total(m), (ma) => (ma._tag === "None" ? fail(O.none()) : pure(ma.value)));

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export const fromPromiseWith_ = <E, A>(promise: () => Promise<A>, onReject: (reason: unknown) => E): EIO<E, A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(onReject, fail, resolve));
   });

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export const fromPromiseWith = <E>(onReject: (reason: unknown) => E) => <A>(promise: () => Promise<A>): EIO<E, A> =>
   fromPromiseWith_(promise, onReject);

/**
 * Create an Task that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export const fromPromise = <A>(promise: () => Promise<A>): EIO<unknown, A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(fail, resolve));
   });

/**
 * Like fromPromise but produces a defect in case of errors
 */
export const fromPromiseDie = <A>(promise: () => Promise<A>): IO<A> =>
   async((resolve) => {
      promise().then(flow(pure, resolve)).catch(flow(die, resolve));
   });

/**
 * Creates a `Task` from a non-throwing function
 */
export const fromFunction = <R, A>(f: (r: R) => A): RIO<R, A> => asks(f);

/**
 * Creates a `Task` from a Task-returning function
 */
export const fromFunctionM = <R, E, A>(f: (r: R) => EIO<E, A>): Task<R, E, A> => asksM(f);
