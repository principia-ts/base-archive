import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as Fiber from "../../Fiber";
import { chain_, fail, pure, total } from "../core";
import type { IO, Task } from "../model";

/**
 * Creates a `Task` value that represents the exit value of the specified
 * fiber.
 */
export const fromFiber = <E, A>(fiber: () => Fiber.Fiber<E, A>): IO<E, A> => chain_(total(fiber), Fiber.join);

/**
 * Creates a `Task` value that represents the exit value of the specified
 * fiber.
 */
export const fromFiberM = <R, E, A, E1>(fiber: Task<R, E, Fiber.Fiber<E1, A>>): Task<R, E | E1, A> =>
   chain_(fiber, Fiber.join);

/**
 * Lifts an `Option` into a `Task` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export const fromMaybe = <A>(m: () => Option<A>): IO<Option<never>, A> =>
   chain_(total(m), (ma) => (ma._tag === "None" ? fail(O.none()) : pure(ma.value)));
