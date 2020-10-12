import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import * as Fiber from "../../Fiber";
import { chain_, fail, pure, total } from "../core";
import type { Effect, IO } from "../Effect";

/**
 * Creates a `Effect` value that represents the exit value of the specified
 * fiber.
 */
export const fromFiber = <E, A>(fiber: () => Fiber.Fiber<E, A>): IO<E, A> => chain_(total(fiber), Fiber.join);

/**
 * Creates a `Effect` value that represents the exit value of the specified
 * fiber.
 */
export const fromFiberM = <R, E, A, E1>(fiber: Effect<R, E, Fiber.Fiber<E1, A>>): Effect<R, E | E1, A> =>
   chain_(fiber, Fiber.join);

/**
 * Lifts an `Option` into a `Effect` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export const fromMaybe = <A>(m: () => Option<A>): IO<Option<never>, A> =>
   chain_(total(m), (ma) => (ma._tag === "None" ? fail(O.none()) : pure(ma.value)));
