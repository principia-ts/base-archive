import type * as HKT from "@principia/core/HKT";
import type { Option } from "@principia/core/Option";

import type { Effect, IO, UIO } from "../Effect/Effect";
import type { StepFunction } from "./Decision";

export const URI = "Schedule";
export type URI = typeof URI;

export type V = HKT.V<"R", "-"> & HKT.V<"E", "-">;

export interface Schedule<R, I, O> {
   readonly step: StepFunction<R, I, O>;
}

export interface ScheduleDriver<R, I, O> {
   readonly next: (input: I) => Effect<R, Option<never>, O>;
   readonly last: IO<Error, O>;
   readonly reset: UIO<void>;
}

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Schedule<R, E, A>;
   }
}
