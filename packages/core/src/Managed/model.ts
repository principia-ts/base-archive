import type { V as Variance } from "@principia/prelude/HKT";

import * as I from "../IO/model";
import type { Finalizer, ReleaseMap } from "./ReleaseMap";

export const URI = "Managed";

export type URI = typeof URI;

export type V = Variance<"R", "-"> & Variance<"E", "+">;

export class Managed<R, E, A> {
  readonly [I._U]: URI;
  readonly [I._R]: (_: R) => void;
  readonly [I._E]: () => E;
  readonly [I._A]: () => A;
  constructor(readonly io: I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>) {}
}

export type UManaged<A> = Managed<unknown, never, A>;
export type URManaged<R, A> = Managed<R, never, A>;
export type FManaged<E, A> = Managed<unknown, E, A>;
