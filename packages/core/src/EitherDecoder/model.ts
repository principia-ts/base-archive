import type * as HKT from "@principia/prelude/HKT";

import type { DecodeErrors } from "../DecodeError";
import type * as E from "../Either";
import type * as K from "../KleisliDecoder";

export interface EitherDecoder<I, A> extends K.KleisliDecoder<[E.URI], C, I, DecodeErrors, A> {
  readonly _meta: {
    readonly name: string;
  };
}

export type C = E.V & HKT.Fix<"E", DecodeErrors>;

export type InputOf<D> = K.InputOf<[E.URI], D>;

export type TypeOf<D> = K.TypeOf<[E.URI], D>;

export const URI = "EitherDecoder";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: EitherDecoder<E, A>;
  }
}
