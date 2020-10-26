import { fromTask, makeExit_ } from "../../Managed/core";
import type { Managed } from "../../Managed/model";
import type { Task } from "../model";

export const toManaged: {
   (): <R, E, A>(ma: Task<R, E, A>) => Managed<R, E, A>;
   <A, R>(release: (a: A) => Task<R, never, any>): <R1, E1>(ma: Task<R1, E1, A>) => Managed<R & R1, E1, A>;
   <A, R = unknown>(release?: (a: A) => Task<R, never, any>): <R1, E1>(fa: Task<R1, E1, A>) => Managed<R1 & R, E1, A>;
} = <A, R>(release?: (a: A) => Task<R, never, any>) => <R1, E1>(ma: Task<R1, E1, A>) =>
   release ? makeExit_(ma, release) : fromTask(ma);
