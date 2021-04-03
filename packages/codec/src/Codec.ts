import type { ErrorInfo } from './DecodeErrors'
import type * as E from './Encoder'

import { identity } from '@principia/base/function'

import * as D from './DecoderK'

export interface Codec<I, O, A> extends D.DecoderK<I, O>, E.Encoder<O, A> {}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeCodec<I, O, A>(decoder: D.DecoderK<I, O>, encoder: E.Encoder<O, A>): Codec<I, O, A> {
  return {
    decode: decoder.decode,
    encode: encoder.encode,
    label: decoder.label
  }
}

export function fromDecoder<I, O>(decoder: D.DecoderK<I, O>): Codec<I, O, O> {
  return {
    decode: decoder.decode,
    encode: identity,
    label: decoder.label
  }
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export function string(info?: ErrorInfo): Codec<unknown, string, string> {
  return fromDecoder(D.string(info))
}

// TODO: The rest of Codec
