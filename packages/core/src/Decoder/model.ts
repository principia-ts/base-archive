import type * as HKT from "@principia/prelude/HKT";

import type { DecodeErrors } from "../DecodeError";
import type * as K from "../KleisliDecoder";

export type V<C> = C & HKT.Fix<"E", DecodeErrors>;

export interface Decoder<F extends HKT.URIS, C, I, O>
  extends K.KleisliDecoder<F, V<C>, I, DecodeErrors, O> {
  readonly _meta: {
    readonly name: string;
  };
}

export type InputOf<M extends HKT.URIS, D> = K.InputOf<M, D>;

export type TypeOf<M extends HKT.URIS, D> = K.TypeOf<M, D>;

export interface DecoderHKT<F, I, O> {
  readonly decode: (i: I) => HKT.HKT2<F, DecodeErrors, O>;
  readonly _meta: {
    readonly name: string;
  };
}
