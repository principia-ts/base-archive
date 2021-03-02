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

export const getShow      = S.deriveFor(make)({})
export const getDecoder   = Dec.deriveFor(make)({})
export const getEncoder   = Enc.deriveFor(make)({})
export const getEq        = Eq.deriveFor(make)({})
export const getGuard     = G.deriveFor(make)({})
export const getArbitrary = Arb.deriveFor(make)({
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
export type { _A, _E, _Env, _R, _S } from './utils'
