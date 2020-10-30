import type * as HKT from "@principia/prelude/HKT";

import type * as E from "../Either";
import type * as K from "../KleisliDecoder";
import type { DecodeError } from "./decode-error";

export interface Decoder<I, A> extends K.KleisliDecoder<[E.URI], C, I, DecodeError, A> {
   readonly _meta: {
      readonly name: string;
   };
}

export type C = E.V & HKT.Fix<"E", DecodeError>;

export type InputOf<D> = K.InputOf<[E.URI], D>;

export type TypeOf<D> = K.TypeOf<[E.URI], D>;

export const URI = "Decoder";

export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Decoder<E, A>;
   }
   interface URItoKind2<TC, E, A> {
      readonly [URI]: Decoder<E, A>;
   }
}
