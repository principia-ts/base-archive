import type { AnyEnv, Model, SummonerEnv, SummonerPURI, SummonerRURI } from '../../HKT'
import type { Summoner } from '../../summoner'
import type { URI } from './HKT'
import type * as S from '@principia/base/Show'

import { pipe } from '@principia/base/Function'

import { memoize, merge } from '../../utils'
import { IntersectionShow } from './intersection'
import { NewtypeShow } from './newtype'
import { NullableShow } from './nullable'
import { ObjectShow } from './object'
import { PrimitivesShow } from './primitives'
import { RecordShow } from './record'
import { RecursiveShow } from './recursive'
import { RefinementShow } from './refinement'
import { SetShow } from './set'
import { SumShow } from './sum'
import { UnknownShow } from './unknown'

export const _allShowInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesShow<Env>(),
    RefinementShow<Env>(),
    RecordShow<Env>(),
    ObjectShow<Env>(),
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
    [K in URI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
  }
) => <S, R, E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, S, R, E, A>): S.Show<A> =>
  pipe(env, F.derive(allShowInterpreters()))
