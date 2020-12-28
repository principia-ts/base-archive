import type { IO } from "../core";

import { identity } from "@principia/base/data/Function";
import * as I from "@principia/base/data/Iterable";

import { map_ } from "../core";
import { either } from "./either";
import { foreachPar_ } from "./foreachPar";

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export function partitionPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, B>
): IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return map_(
    foreachPar_(as, (a) => either(f(a))),
    I.partitionMap(identity)
  );
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export function partitionPar<R, E, A, B>(
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (as) => partitionPar_(as, f);
}
