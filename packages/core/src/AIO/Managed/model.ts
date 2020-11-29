import type { V as Variance } from "@principia/prelude/HKT";

import * as T from "../AIO/model";
import type { Finalizer, ReleaseMap } from "./ReleaseMap";

export const URI = "Managed";

export type URI = typeof URI;

export type V = Variance<"R", "-"> & Variance<"E", "+">;

export class Managed<R, E, A> {
  readonly [T._U]: URI;
  readonly [T._R]: (_: R) => void;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A;
  constructor(readonly aio: T.AIO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>) {}
}

export type InferSuccess<T> = T extends Managed<infer R, infer E, infer A> ? A : never;

export type IO<A> = Managed<unknown, never, A>;
export type RIO<R, A> = Managed<R, never, A>;
export type EIO<E, A> = Managed<unknown, E, A>;
