import type { DecodeErrors } from './DecodeErrors'
import type { DecoderK } from './DecoderK'

import * as Sy from '@principia/io/Sync'

import * as DE from './DecodeErrors'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface SyncDecoder<I, A> {
  readonly decode: (i: I) => Sy.Sync<unknown, DecodeErrors, A>
  readonly label: string
}

export const Validation = DE.getValidation({
  ...Sy.MonadExcept,
  ...Sy.Bifunctor,
  ...Sy.Alt
})

export function fromDecoder<I, O>(decoder: DecoderK<I, O>): SyncDecoder<I, O> {
  return {
    decode: decoder.decode(Validation),
    label: decoder.label
  }
}

export function decode<I, O>(decoder: DecoderK<I, O>): (i: I) => Sy.Sync<unknown, DecodeErrors, O> {
  return (i) => decoder.decode(Validation)(i)
}
