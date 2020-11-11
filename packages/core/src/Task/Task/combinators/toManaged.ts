import { fromTask, makeExit_ } from "../../Managed/_core";
import type { Managed } from "../../Managed/model";
import type { Task } from "../model";

export const toManaged_: {
   <R, E, A>(ma: Task<R, E, A>): Managed<R, E, A>;
   <R, E, A, R1>(ma: Task<R, E, A>, release: (a: A) => Task<R1, never, any>): Managed<R & R1, E, A>;
} = <R, E, A, R1 = unknown>(ma: Task<R, E, A>, release?: (a: A) => Task<R1, never, any>): Managed<R & R1, E, A> =>
   release ? makeExit_(ma, release) : fromTask(ma);

export const toManaged: {
   (): <R, E, A>(ma: Task<R, E, A>) => Managed<R, E, A>;
   <A, R>(release: (a: A) => Task<R, never, any>): <R1, E1>(ma: Task<R1, E1, A>) => Managed<R & R1, E1, A>;
} = <A, R>(release?: (a: A) => Task<R, never, any>) => <R1, E1>(ma: Task<R1, E1, A>) =>
   release ? makeExit_(ma, release) : fromTask(ma);
