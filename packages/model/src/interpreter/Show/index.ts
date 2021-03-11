import type { Model } from '../../abstract/Model'
import type { SummonerEnv, SummonerPURI, SummonerRURI } from '../../abstract/Summoner'
import type { AnyEnv } from '../../HKT'
import type { Summoner } from '../../summoner'
import type * as S from '@principia/base/Show'

import { pipe } from '@principia/base/Function'

import { memoize, merge } from '../../utils'
import { ShowURI } from './HKT'
import { IntersectionShow } from './intersection'
import { NewtypeShow } from './newtype'
import { NullableShow } from './nullable'
import { PrimitivesShow } from './primitives'
import { RecordShow } from './record'
import { RecursiveShow } from './recursive'
import { RefinementShow } from './refinement'
import { SetShow } from './set'
import { StructShow } from './struct'
import { SumShow } from './sum'
import { UnknownShow } from './unknown'

export { ShowURI }

export const _allShowInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesShow<Env>(),
    RefinementShow<Env>(),
    RecordShow<Env>(),
    StructShow<Env>(),
    NewtypeShow<Env>(),
    RecursiveShow<Env>(),
    SetShow<Env>(),
    SumShow<Env>(),
    NullableShow<Env>(),
    IntersectionShow<Env>(),
    UnknownShow<Env>()
  )

export const allShowInterpreters = memoize(_allShowInterpreters) as typeof _allShowInterpreters

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
  env: {
    [K in ShowURI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
  }
) => <E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, E, A>): S.Show<A> =>
  pipe(env, F.derive(allShowInterpreters()))
