import type { IO, URIO } from "../core";

import * as A from "@principia/base/data/Array";
import * as I from "@principia/base/data/Iterable";

import * as Fiber from "../../Fiber";
import { flatMap_, foreach_, fork, map_, unit } from "../core";

/**
 * Returns an IO that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 */
export function forkAll<R, E, A>(
  efs: Iterable<IO<R, E, A>>
): URIO<R, Fiber.Fiber<E, ReadonlyArray<A>>> {
  return map_(
    foreach_(efs, fork),
    A.foldLeft(Fiber.succeed([]) as Fiber.Fiber<E, ReadonlyArray<A>>, (b, a) =>
      Fiber.map2_(b, a, (_a, _b) => [..._a, _b])
    )
  );
}

/**
 * Returns an IO that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than [[forkAll]]
 * in cases where the results of the forked fibers are not needed.
 */
export function forkAllUnit<R, E, A>(efs: Iterable<IO<R, E, A>>): URIO<R, void> {
  return I.foldLeft_(efs, unit() as URIO<R, void>, (b, a) => flatMap_(fork(a), () => b));
}
