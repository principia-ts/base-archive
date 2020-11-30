import type { Option } from "../../Option";
import type { FIO, IO, UIO } from "../model";
import type { StepFunction } from "./Decision";

export const URI = "Schedule";
export type URI = typeof URI;

export class Schedule<R, I, O> {
  constructor(readonly step: StepFunction<R, I, O>) {}
}

export class ScheduleExecutor<R, I, O> {
  constructor(
    readonly next: (input: I) => IO<R, Option<never>, O>,
    readonly last: FIO<Error, O>,
    readonly reset: UIO<void>
  ) {}
}
