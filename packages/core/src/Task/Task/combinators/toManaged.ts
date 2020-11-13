import { fromTask, makeExit_ } from "../../Managed/_core";
import type { Managed } from "../../Managed/model";
import type { Task } from "../model";

export function toManaged_<R, E, A>(ma: Task<R, E, A>): Managed<R, E, A>;
export function toManaged_<R, E, A, R1>(
   ma: Task<R, E, A>,
   release: (a: A) => Task<R1, never, any>
): Managed<R & R1, E, A>;
export function toManaged_<R, E, A, R1 = unknown>(
   ma: Task<R, E, A>,
   release?: (a: A) => Task<R1, never, any>
): Managed<R & R1, E, A> {
   return release ? makeExit_(ma, release) : fromTask(ma);
}

export function toManaged(): <R, E, A>(ma: Task<R, E, A>) => Managed<R, E, A>;
export function toManaged<A, R>(
   release: (a: A) => Task<R, never, any>
): <R1, E1>(ma: Task<R1, E1, A>) => Managed<R & R1, E1, A>;
export function toManaged<A, R>(
   release?: (a: A) => Task<R, never, any>
): <R1, E1>(ma: Task<R1, E1, A>) => Managed<R & R1, E1, A> {
   return (ma) => (release ? makeExit_(ma, release) : fromTask(ma));
}
