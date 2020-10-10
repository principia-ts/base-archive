import type * as HKT from "@principia/prelude/HKT";

import type { FiberId } from "../Fiber/FiberId";
import type { AtomicReference } from "../Support";
import type { State } from "./state";

export class XPromise<E, A> {
   constructor(readonly state: AtomicReference<State<E, A>>, readonly blockingOn: ReadonlyArray<FiberId>) {}
}

export const URI = "XPromise";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: XPromise<E, A>;
   }
}
