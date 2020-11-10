import type { Option } from "../../Option";
import type { EIO, IO, Task } from "../Task/model";
import type { StepFunction } from "./Decision";

export const URI = "Schedule";
export type URI = typeof URI;

export interface Schedule<R, I, O> {
   readonly step: StepFunction<R, I, O>;
}

export interface ScheduleExecutor<R, I, O> {
   readonly next: (input: I) => Task<R, Option<never>, O>;
   readonly last: EIO<Error, O>;
   readonly reset: IO<void>;
}
