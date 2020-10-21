import { fromEffect, makeExit_ } from "../../Managed/core";
import type { Managed } from "../../Managed/Managed";
import type { Effect } from "../model";

export const toManaged: {
   (): <R, E, A>(ma: Effect<R, E, A>) => Managed<R, E, A>;
   <A, R>(release: (a: A) => Effect<R, never, any>): <R1, E1>(ma: Effect<R1, E1, A>) => Managed<R & R1, E1, A>;
   <A, R = unknown>(release?: (a: A) => Effect<R, never, any>): <R1, E1>(
      fa: Effect<R1, E1, A>
   ) => Managed<R1 & R, E1, A>;
} = <A, R>(release?: (a: A) => Effect<R, never, any>) => <R1, E1>(ma: Effect<R1, E1, A>) =>
   release ? makeExit_(ma, release) : fromEffect(ma);
