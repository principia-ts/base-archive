import { fromEffect, makeExit_ } from "../../Managed/core";
import type { Managed } from "../../Managed/Managed";
import type { Effect } from "../Effect";

export const toManaged = <A = unknown, R = unknown>(release?: (a: A) => Effect<R, never, any>) => <
   R1,
   E1,
   A1 extends A
>(
   self: Effect<R1, E1, A1>
): Managed<R1 & R, E1, A1> => (release ? makeExit_(self, (a) => release(a)) : fromEffect(self));
