import type { Option } from "@principia/core/Option";

import type { Effect, IO, UIO } from "../Effect/Effect";
import type { StepFunction } from "./Decision";

export const URI = "Schedule";
export type URI = typeof URI;

export interface Schedule<R, I, O> {
   readonly step: StepFunction<R, I, O>;
}

export interface ScheduleDriver<R, I, O> {
   readonly next: (input: I) => Effect<R, Option<never>, O>;
   readonly last: IO<Error, O>;
   readonly reset: UIO<void>;
}
