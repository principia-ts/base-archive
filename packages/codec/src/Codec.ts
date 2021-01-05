import type { ErrorInfo } from './DecodeErrors'
import type * as E from './Encoder'

import { identity } from '@principia/base/data/Function'

import * as D from './DecoderKF'

export interface Codec<I, O, A> extends D.DecoderKF<I, O>, E.Encoder<O, A> {}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeCodec<I, O, A>(decoder: D.DecoderKF<I, O>, encoder: E.Encoder<O, A>): Codec<I, O, A> {
  return {
    decode: decoder.decode,
    encode: encoder.encode,
    _meta: decoder._meta
  }
}

export function fromDecoder<I, O>(decoder: D.DecoderKF<I, O>): Codec<I, O, O> {
  return {
    decode: decoder.decode,
    encode: identity,
    _meta: decoder._meta
  }
}

/*
 * -------------------------------------------
 * Priimitives
 * -------------------------------------------
 */

export function string(info?: ErrorInfo): Codec<unknown, string, string> {
  return fromDecoder(D.string(info))
}

// TODO: The rest of Codec
