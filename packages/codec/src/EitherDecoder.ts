import type { DecodeError } from './DecodeError'
import type { DecodeErrors, ErrorInfo } from './DecodeErrors'
import type * as KF from './DecoderKF'
import type { Semigroup } from '@principia/base/Semigroup'
import type { FreeSemigroup } from '@principia/free/FreeSemigroup'

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

/**
 * @internal
 */
export const SE: Semigroup<FreeSemigroup<DecodeError<ErrorInfo>>> = DE.getSemigroup<ErrorInfo>()

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
