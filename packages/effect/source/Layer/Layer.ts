import type { Managed } from "../Managed/Managed";

export const URI = "Layer";

export type URI = typeof URI;

export interface Layer<R, E, A> {
   readonly build: Managed<R, E, A>;
}

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Layer<R, E, A>;
   }
}
