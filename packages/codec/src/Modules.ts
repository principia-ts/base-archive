import type { DecoderK } from './DecoderK'
import type { EitherDecoder } from './EitherDecoder'
import type { Encoder } from './Encoder'
import type { FreeDecoderK } from './FreeDecoderK'

export const FreeDecoderKURI = 'FreeDecoderK'
export type FreeDecoderKURI = typeof FreeDecoderKURI

export const DecoderKURI = 'DecoderK'
export type DecoderKURI = typeof DecoderKURI

export const EncoderURI = 'Encoder'
export type EncoderURI = typeof EncoderURI

export const EitherDecoderURI = 'EitherDecoder'
export type EitherDecoderURI = typeof EitherDecoderURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [FreeDecoderKURI]: FreeDecoderK<I, E, A>
    [DecoderKURI]: DecoderK<I, A>
    [EncoderURI]: Encoder<E, A>
    [EitherDecoderURI]: EitherDecoder<I, A>
  }
}
