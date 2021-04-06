import type { Decoder } from './Decoder'
import type { Encoder } from './Encoder'

export const DecoderURI = 'Decoder'
export type DecoderURI = typeof DecoderURI

export const EncoderURI = 'Encoder'
export type EncoderURI = typeof EncoderURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [DecoderURI]: Decoder<I, E, A>
    [EncoderURI]: Encoder<I, A>
  }
}
