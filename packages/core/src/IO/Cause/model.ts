import type * as HKT from "@principia/prelude/HKT";

import type { FiberId } from "../Fiber/FiberId";
import type { Trace } from "../Fiber/tracing";

export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E> | Traced<E>;

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

export interface Traced<E> {
  readonly _tag: "Traced";
  readonly cause: Cause<E>;
  readonly trace: Trace;
}

export const URI = "Cause";

export type URI = typeof URI;

export type V = HKT.Auto;
