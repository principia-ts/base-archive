import type * as HKT from "@principia/prelude/HKT";

import type { Erase } from "../Utils";

export const StateInURI = "StateIn";
export type StateInURI = typeof StateInURI;

export const StateOutURI = "StateOut";
export type StateOutURI = typeof StateOutURI;

export type StateIn<S, A> = (s: S) => A;

export type StateOut<S, A> = readonly [A, S];

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [StateInURI]: StateIn<S, A>;
    readonly [StateOutURI]: StateOut<S, A>;
  }
}

export type V<C> = HKT.Unfix<Erase<HKT.Strip<C, "S">, HKT.Auto>, "S"> & HKT.V<"S", "_">;

export type StateT<F extends HKT.URIS> = HKT.PrependURI<StateInURI, HKT.AppendURI<F, StateOutURI>>;
