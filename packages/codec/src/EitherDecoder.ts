import type { DecodeErrors, ErrorInfo } from './DecodeErrors'
import type * as KF from './DecoderKF'
import type { Refinement } from '@principia/base/data/Function'
import type { Guard } from '@principia/base/data/Guard'
import type * as O from '@principia/base/data/Option'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/typeclass'
import type { Literal, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/data/Array'
import * as E from '@principia/base/data/Either'
import { pipe } from '@principia/base/data/Function'
import * as G from '@principia/base/data/Guard'
import * as R from '@principia/base/data/Record'
import * as FS from '@principia/free/FreeSemigroup'

import * as DE from './DecodeError'
import { error, getDecodeErrorsValidation } from './DecodeErrors'

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

export type C = HKT.CleanParam<E.V, 'E'> & HKT.Fix<'E', DecodeErrors>

export const URI = 'EitherDecoder'

export type URI = typeof URI

export type V = HKT.V<'E', '+'>

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
  ...E.MonadFail,
  ...E.Bifunctor,
  ...E.Alt,
  ...E.Fallible
})

export function fromDecoderKF<I, O>(decoder: KF.DecoderKF<I, O>): EitherDecoder<I, O> {
  return {
    decode: decoder.decode(M),
    _meta: decoder._meta
  }
}