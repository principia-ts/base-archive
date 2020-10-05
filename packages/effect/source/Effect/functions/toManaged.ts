import { _makeExit, fromEffect } from "../../Managed/core";
import type { Managed } from "../../Managed/Managed";
import type { Effect } from "../Effect";

export function toManaged<A = unknown, S = never, R = unknown>(
   release?: (a: A) => Effect<R, never, any>
) {
   return <R1, E1, A1 extends A>(self: Effect<R1, E1, A1>): Managed<R1 & R, E1, A1> =>
      release ? _makeExit(self, (a) => release(a)) : fromEffect(self);
}
