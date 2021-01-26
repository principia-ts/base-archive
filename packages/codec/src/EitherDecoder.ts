import type { DecodeErrors, ErrorInfo } from './DecodeErrors'
import type * as KF from './DecoderKF'
import type * as HKT from '@principia/base/HKT'

import * as E from '@principia/base/Either'

import * as DE from './DecodeError'
import { getDecodeErrorsValidation } from './DecodeErrors'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface EitherDecoder<I, A> {
  readonly decode: (i: I) => E.Either<DecodeErrors, A>
  readonly _meta: {
    readonly name: string
  }
}

export type V = HKT.CleanParam<E.V, 'E'> & HKT.Fix<'E', DecodeErrors>

export const URI = 'EitherDecoder'

export type URI = typeof URI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: EitherDecoder<E, A>
  }
}

/**
 * @internal
 */
export const SE = DE.getSemigroup<ErrorInfo>()

const M = getDecodeErrorsValidation({
  ...E.MonadExcept,
  ...E.Bifunctor,
  ...E.Alt
})

export function fromDecoderKF<I, O>(decoder: KF.DecoderKF<I, O>): EitherDecoder<I, O> {
  return {
    decode: decoder.decode(M),
    _meta: decoder._meta
  }
}

export function decode<I, O>(decoder: KF.DecoderKF<I, O>): (i: I) => E.Either<DecodeErrors, O> {
  return (i) => decoder.decode(M)(i)
}
