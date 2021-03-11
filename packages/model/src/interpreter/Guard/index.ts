import type { Model } from '../../abstract/Model'
import type { SummonerEnv, SummonerPURI, SummonerRURI } from '../../abstract/Summoner'
import type { AnyEnv } from '../../HKT'
import type { Summoner } from '../../summoner'
import type * as G from '@principia/base/Guard'

import { pipe } from '@principia/base/Function'

import { memoize, merge } from '../../utils'
import { GuardURI } from './HKT'
import { IntersectionGuard } from './intersection'
import { NewtypeGuard } from './newtype'
import { NullableGuard } from './nullable'
import { PrimitivesGuard } from './primitives'
import { RecordGuard } from './record'
import { RecursiveGuard } from './recursive'
import { RefinementGuard } from './refinement'
import { SetGuard } from './set'
import { ObjectGuard } from './struct'
import { SumGuard } from './sum'
import { UnknownGuard } from './unknown'

export { GuardURI }

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
    IntersectionGuard<Env>(),
    UnknownGuard<Env>()
  )

export const allGuardInterpreters = memoize(_allGuardInterpreters) as typeof _allGuardInterpreters

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
  env: {
    [K in GuardURI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
  }
) => <E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, E, A>): G.Guard<unknown, A> =>
  pipe(env, F.derive(allGuardInterpreters()))
