import type { V as Variance } from "@principia/core/HKT";

import type * as T from "../Effect/Effect";
import type { Finalizer, ReleaseMap } from "./ReleaseMap";

export const URI = "Managed";

export type URI = typeof URI;

export type V = Variance<"R", "-"> & Variance<"E", "+">;

export interface Managed<R, E, A> {
   readonly [T._U]: URI;
   readonly [T._R]: (_: R) => void;
   readonly [T._E]: () => E;
   readonly [T._A]: () => A;
   readonly effect: T.Effect<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>;
}

export type InferSuccess<T> = T extends Managed<infer R, infer E, infer A> ? A : never;

export type UIO<A> = Managed<unknown, never, A>;
export type RIO<R, A> = Managed<R, never, A>;
export type IO<E, A> = Managed<unknown, E, A>;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Managed<R, E, A>;
   }
}
