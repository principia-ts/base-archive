import type { Model } from '../../abstract/Model'
import type { SummonerEnv, SummonerPURI, SummonerRURI } from '../../abstract/Summoner'
import type { AnyEnv } from '../../HKT'
import type { Summoner } from '../../summoner'
import type * as D from '@principia/codec/Decoder'

import { pipe } from '@principia/base/function'

import { memoize, merge } from '../../utils'
import { DecoderURI } from './HKT'
import { IntersectionDecoder } from './intersection'
import { NewtypeDecoder } from './newtype'
import { NullableDecoder } from './nullable'
import { PrimitivesDecoder } from './primitives'
import { RecordDecoder } from './record'
import { RecursiveDecoder } from './recursive'
import { RefinementDecoder } from './refinement'
import { SetDecoder } from './set'
import { ObjectDecoder } from './struct'
import { SumDecoder } from './sum'
import { UnknownDecoder } from './unknown'

export { DecoderURI as DecoderURI }

export const _allDecoderInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesDecoder<Env>(),
    RefinementDecoder<Env>(),
    RecordDecoder<Env>(),
    ObjectDecoder<Env>(),
    NewtypeDecoder<Env>(),
    RecursiveDecoder<Env>(),
    SetDecoder<Env>(),
    SumDecoder<Env>(),
    NullableDecoder<Env>(),
    IntersectionDecoder<Env>(),
    UnknownDecoder<Env>()
  )

export const allDecoderInterpreters = memoize(_allDecoderInterpreters) as typeof _allDecoderInterpreters

export function deriveFor<Su extends Summoner<any>>(
  S: Su
): (
  env: {
    [K in DecoderURI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
  }
) => <I, E, A, O>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, I, E, A, O>) => D.Decoder<I, E, A> {
  return (env) => (F) => pipe(env, F.derive(allDecoderInterpreters()))
}
