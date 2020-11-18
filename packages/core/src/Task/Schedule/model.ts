import type { Option } from "../../Option";
import type { EIO, IO, Task } from "../Task/model";
import type { StepFunction } from "./Decision";

export const URI = "Schedule";
export type URI = typeof URI;

export class Schedule<R, I, O> {
  constructor(readonly step: StepFunction<R, I, O>) {}
}

export class ScheduleExecutor<R, I, O> {
  constructor(
    readonly next: (input: I) => Task<R, Option<never>, O>,
    readonly last: EIO<Error, O>,
    readonly reset: IO<void>
  ) {}
}
