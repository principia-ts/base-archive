import type { Model } from '../../abstract/Model'
import type { SummonerEnv, SummonerPURI, SummonerRURI } from '../../abstract/Summoner'
import type { AnyEnv } from '../../HKT'
import type { Summoner } from '../../summoner'
import type * as E from '@principia/codec/Encoder'

import { pipe } from '@principia/base/Function'

import { memoize, merge } from '../../utils'
import { EncoderURI } from './HKT'
import { IntersectionEncoder } from './intersection'
import { NewtypeEncoder } from './newtype'
import { NullableEncoder } from './nullable'
import { PrimitivesEncoder } from './primitives'
import { RecordEncoder } from './record'
import { RecursiveEncoder } from './recursive'
import { RefinementEncoder } from './refinement'
import { SetEncoder } from './set'
import { ObjectEncoder } from './struct'
import { SumEncoder } from './sum'
import { UnknownEncoder } from './unknown'

export { EncoderURI }

export const _allEncoderInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesEncoder<Env>(),
    RefinementEncoder<Env>(),
    RecordEncoder<Env>(),
    ObjectEncoder<Env>(),
    NewtypeEncoder<Env>(),
    RecursiveEncoder<Env>(),
    SetEncoder<Env>(),
    SumEncoder<Env>(),
    NullableEncoder<Env>(),
    IntersectionEncoder<Env>(),
    UnknownEncoder<Env>()
  )

export const allEncoderInterpreters = memoize(_allEncoderInterpreters) as typeof _allEncoderInterpreters

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
  env: {
    [K in EncoderURI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
  }
) => <E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, E, A>): E.Encoder<E, A> =>
  pipe(env, F.derive(allEncoderInterpreters()))
