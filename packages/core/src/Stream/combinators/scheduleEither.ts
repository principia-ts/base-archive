import * as E from "../../Either";
import type { Has } from "../../Has";
import type { Clock } from "../../IO/Clock";
import type { Schedule } from "../../IO/Schedule";
import type { Stream } from "../model";
import { scheduleWith } from "./scheduleWith";

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither_<R, R1, E, O, B>(
  ma: Stream<R, E, O>,
  schedule: Schedule<R1, O, B>
): Stream<R & R1 & Has<Clock>, E, E.Either<B, O>> {
  return scheduleWith(schedule)(E.right, E.left)(ma);
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither<R1, O, B>(schedule: Schedule<R1, O, B>) {
  return <R, E>(ma: Stream<R, E, O>) => scheduleEither_(ma, schedule);
}
