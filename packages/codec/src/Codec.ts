import type { ErrorInfo } from "./DecodeErrors";
import type * as E from "./Encoder";
import type * as HKT from "@principia/base/HKT";
import type * as P from "@principia/base/typeclass";

import { identity } from "@principia/base/data/Function";

import * as D from "./Decoder";

export interface Codec<M extends HKT.URIS, C, I, O, A>
  extends D.Decoder<M, C, I, O>,
    E.Encoder<O, A> {}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeCodec<M extends HKT.URIS, C, I, O, A>(
  decoder: D.Decoder<M, C, I, O>,
  encoder: E.Encoder<O, A>
): Codec<M, C, I, O, A> {
  return {
    decode: decoder.decode,
    encode: encoder.encode,
    _meta: decoder._meta
  };
}

export function fromDecoder<M extends HKT.URIS, C, I, O>(
  decoder: D.Decoder<M, C, I, O>
): Codec<M, C, I, O, O> {
  return {
    decode: decoder.decode,
    encode: identity,
    _meta: decoder._meta
  };
}

/*
 * -------------------------------------------
 * Priimitives
 * -------------------------------------------
 */

export function string<M extends HKT.URIS, C>(
  M: P.MonadFail<M, D.V<C>>
): (info?: ErrorInfo) => Codec<M, C, unknown, string, string> {
  return (info) => fromDecoder(D.string(M)(info));
}

// TODO: The rest of Codec
