import type { Auto } from "@principia/core/HKT";

import type { FiberId } from "../Fiber/FiberId";

export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E>;

export interface Empty {
   readonly _tag: "Empty";
}

export interface Fail<E> {
   readonly _tag: "Fail";
   readonly value: E;
}

export interface Die {
   readonly _tag: "Die";
   readonly value: unknown;
}

export interface Interrupt {
   readonly _tag: "Interrupt";
   readonly fiberId: FiberId;
}

export interface Then<E> {
   readonly _tag: "Then";
   readonly left: Cause<E>;
   readonly right: Cause<E>;
}

export interface Both<E> {
   readonly _tag: "Both";
   readonly left: Cause<E>;
   readonly right: Cause<E>;
}

export const URI = "Cause";

export type URI = typeof URI;

export type V = Auto;

declare module "@principia/core/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Cause<A>;
   }
}
