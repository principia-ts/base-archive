import type { Has } from "../../Has";
import type { Clock } from "../../IO/Clock";
import * as SC from "../../IO/Schedule";
import type { Stream } from "../model";
import { schedule_ } from "./schedule";

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed_<R, E, O>(
  ma: Stream<R, E, O>,
  duration: number
): Stream<R & Has<Clock>, E, O> {
  return schedule_(ma, SC.fixed(duration));
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed(duration: number) {
  return <R, E, O>(self: Stream<R, E, O>) => fixed_(self, duration);
}
