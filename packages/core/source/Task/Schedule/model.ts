import type { Option } from "../../Option";
import type { IO, Task, UIO } from "../Task/model";
import type { StepFunction } from "./Decision";

export const URI = "Schedule";
export type URI = typeof URI;

export interface Schedule<R, I, O> {
   readonly step: StepFunction<R, I, O>;
}

export interface ScheduleExecutor<R, I, O> {
   readonly next: (input: I) => Task<R, Option<never>, O>;
   readonly last: IO<Error, O>;
   readonly reset: UIO<void>;
}
