import type { Stream } from "../core";
import type { Predicate } from "@principia/base/data/Function";

import { not } from "@principia/base/data/Function";

import { drop_ } from "./drop";
import { dropWhile_ } from "./dropWhile";

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil_<R, E, O>(ma: Stream<R, E, O>, p: Predicate<O>): Stream<R, E, O> {
  return drop_(dropWhile_(ma, not(p)), 1);
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil<O>(p: Predicate<O>): <R, E>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => dropUntil_(ma, p);
}
