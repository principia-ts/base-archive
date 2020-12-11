import * as A from "../../Array/_core";
import { pipe } from "../../Function";
import * as I from "../../Iterable";
import * as O from "../../Option";
import { chain, chain_, foreach_, fork, map_, unit } from "../_core";
import * as Fiber from "../Fiber";
import * as FiberRef from "../FiberRef";
import type { IO, URIO } from "../model";
import { uninterruptibleMask } from "./interrupt";

/**
 * Returns an IO that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 */
export function forkAll<R, E, A>(
  efs: Iterable<IO<R, E, A>>
): URIO<R, Fiber.Fiber<E, ReadonlyArray<A>>> {
  return map_(
    foreach_(efs, fork),
    A.reduce(Fiber.succeed([]) as Fiber.Fiber<E, ReadonlyArray<A>>, (b, a) =>
      Fiber.zipWith_(b, a, (_a, _b) => [..._a, _b])
    )
  );
}

/**
 * Returns an IO that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than [[forkAll]]
 * in cases where the results of the forked fibers are not needed.
 */
export function forkAllUnit<R, E, A>(efs: Iterable<IO<R, E, A>>): URIO<R, void> {
  return I.reduce_(efs, unit() as URIO<R, void>, (b, a) => chain_(fork(a), () => b));
}
