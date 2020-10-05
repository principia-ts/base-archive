import { Eq } from "../Eq";
import { CompareF } from "./CompareF";

export const URI = "Ord";

export type URI = typeof URI;

export interface Ord<A> extends Eq<A> {
   readonly compare: CompareF<A>;
}

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      [URI]: Ord<A>;
   }
}
