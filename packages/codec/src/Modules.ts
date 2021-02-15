import type { DecoderK } from './DecoderK'
import type { DecoderKF } from './DecoderKF'
import type { EitherDecoder } from './EitherDecoder'
import type { Encoder } from './Encoder'

export const DecoderKURI = 'DecoderK'
export type DecoderKURI = typeof DecoderKURI

export const DecoderKFURI = 'DecoderKF'
export type DecoderKFURI = typeof DecoderKFURI

export const EncoderURI = 'Encoder'
export type EncoderURI = typeof EncoderURI

export const EitherDecoderURI = 'EitherDecoder'
export type EitherDecoderURI = typeof EitherDecoderURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [DecoderKURI]: DecoderK<I, E, A>
    [DecoderKFURI]: DecoderKF<I, A>
    [EncoderURI]: Encoder<E, A>
    [EitherDecoderURI]: EitherDecoder<I, A>
  }
}
