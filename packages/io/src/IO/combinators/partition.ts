import type { IO } from "../core";

import { identity } from "@principia/base/data/Function";
import * as I from "@principia/base/data/Iterable";

import { foreach_, map_ } from "../core";
import { either } from "./either";

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in a separated fashion.
 */
export function partition_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, B>
): IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return map_(
    foreach_(as, (a) => either(f(a))),
    I.partitionMap(identity)
  );
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in a separated fashion.
 */
export function partition<R, E, A, B>(
  f: (a: A) => IO<R, E, B>
): (fas: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (fas) => partition_(fas, f);
}
