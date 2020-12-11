import { chain_, total } from "../_core";
import * as Fiber from "../Fiber";
import type { FIO } from "../model";

/**
 * Creates a `IO` value that represents the exit value of the specified
 * fiber.
 */
export function fromFiber<E, A>(fiber: () => Fiber.Fiber<E, A>): FIO<E, A> {
  return chain_(total(fiber), Fiber.join);
}
