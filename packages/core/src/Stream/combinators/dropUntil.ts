import type { Predicate } from "../../Function";
import { not } from "../../Function";
import type { Stream } from "../model";
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