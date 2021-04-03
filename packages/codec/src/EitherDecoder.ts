import type { DecodeErrors } from './DecodeErrors'
import type * as D from './DecoderK'

import * as E from '@principia/base/Either'

import * as DE from './DecodeErrors'
import { EitherDecoderURI } from './Modules'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface EitherDecoder<I, A> {
  readonly decode: (i: I) => E.Either<DecodeErrors, A>
  readonly label: string
}

export const Validation = DE.getValidation({
  ...E.MonadExcept,
  ...E.Bifunctor,
  ...E.Alt
})

export function fromDecoder<I, O>(decoder: D.DecoderK<I, O>): EitherDecoder<I, O> {
  return {
    decode: decoder.decode(Validation),
    label: decoder.label
  }
}

export function decode<I, O>(decoder: D.DecoderK<I, O>): (i: I) => E.Either<DecodeErrors, O> {
  return (i) => decoder.decode(Validation)(i)
}

export { EitherDecoderURI }
