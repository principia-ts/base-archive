import type { AnyEnv, Model, SummonerEnv, SummonerPURI, SummonerRURI } from '../../HKT'
import type { Summoner } from '../../summoner'
import type * as G from '@principia/base/Guard'

import { pipe } from '@principia/base/Function'

import { memoize, merge } from '../../utils'
import { IntersectionGuard } from './intersection'
import { NewtypeGuard } from './newtype'
import { NullableGuard } from './nullable'
import { ObjectGuard } from './object'
import { PrimitivesGuard } from './primitives'
import { RecordGuard } from './record'
import { RecursiveGuard } from './recursive'
import { RefinementGuard } from './refinement'
import { SetGuard } from './set'
import { SumGuard } from './sum'

export const _allGuardInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesGuard<Env>(),
    RefinementGuard<Env>(),
    RecordGuard<Env>(),
    ObjectGuard<Env>(),
    NewtypeGuard<Env>(),
    RecursiveGuard<Env>(),
    SetGuard<Env>(),
    SumGuard<Env>(),
    NullableGuard<Env>(),
    IntersectionGuard<Env>()
  )

export const allGuardInterpreters = memoize(_allGuardInterpreters) as typeof _allGuardInterpreters

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
  env: {
    [K in G.URI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
  }
) => <S, R, E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, S, R, E, A>): G.Guard<unknown, A> =>
  pipe(env, F.derive(allGuardInterpreters()))
