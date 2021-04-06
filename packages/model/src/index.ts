import type { Model } from './abstract/Model'
import type { FastCheckEnv } from './interpreter/Arbitrary/HKT'
import type * as E from '@principia/base/Eq'
import type { Guard } from '@principia/base/Guard'
import type { Show } from '@principia/base/Show'
import type { Decoder } from '@principia/codec/Decoder'
import type { Encoder } from '@principia/codec/Encoder'
import type { Arbitrary } from 'fast-check'

import * as fc from 'fast-check'

import * as Arb from './interpreter/Arbitrary'
import { ArbitraryURI } from './interpreter/Arbitrary/HKT'
import * as Dec from './interpreter/Decoder'
import * as Enc from './interpreter/Encoder'
import * as Eq from './interpreter/Eq'
import * as G from './interpreter/Guard'
import * as S from './interpreter/Show'
import { summonFor } from './summoner'

export const { make, makeADT } = summonFor({})

export const getShow: <I, E, A, O>(
  F: Model<'model/NoUnion', 'model/Result', FastCheckEnv, I, E, A, O>
) => Show<A> = S.deriveFor(make)({})

export const getDecoder: <I, E, A, O>(
  F: Model<'model/NoUnion', 'model/Result', FastCheckEnv, I, E, A, O>
) => Decoder<I, E, A> = Dec.deriveFor(make)({})

export const getEncoder: <I, E, A, O>(
  F: Model<'model/NoUnion', 'model/Result', FastCheckEnv, I, E, A, O>
) => Encoder<A, O> = Enc.deriveFor(make)({})

export const getEq: <I, E, A, O>(
  F: Model<'model/NoUnion', 'model/Result', FastCheckEnv, I, E, A, O>
) => E.Eq<A> = Eq.deriveFor(make)({})

export const getGuard: <I, E, A, O>(
  F: Model<'model/NoUnion', 'model/Result', FastCheckEnv, I, E, A, O>
) => Guard<unknown, A> = G.deriveFor(make)({})

export const getArbitrary: <I, E, A, O>(
  F: Model<'model/NoUnion', 'model/Result', FastCheckEnv, I, E, A, O>
) => Arbitrary<A> = Arb.deriveFor(make)({
  [ArbitraryURI]: {
    module: fc
  }
})

export {} from './HKT'
export { ArbitraryURI } from './interpreter/Arbitrary'
export {} from './interpreter/Arbitrary/HKT'
export { DecoderURI } from './interpreter/Decoder'
export {} from './interpreter/Decoder/HKT'
export { EncoderURI } from './interpreter/Encoder'
export {} from './interpreter/Encoder/HKT'
export { EqURI } from './interpreter/Eq'
export {} from './interpreter/Eq/HKT'
export { GuardURI } from './interpreter/Guard'
export {} from './interpreter/Guard/HKT'
export { ShowURI } from './interpreter/Show'
export {} from './interpreter/Show/HKT'
export type { M, M_, MM, MM_ } from './summoner'
export { opaque, opaque_ } from './summoner'
export type { _A, _E, _Env } from './utils'
