import type { AnyEnv, Model, SummonerEnv, SummonerPURI, SummonerRURI } from '../../HKT'
import type { Summoner } from '../../summoner'
import type { ArbURI } from './HKT'
import type { Arbitrary } from 'fast-check'

import { pipe } from '@principia/base/Function'

import { memoize, merge } from '../../utils'
import { IntersectionArbitrary } from './intersection'
import { NewtypeArbitrary } from './newtype'
import { NullableArbitrary } from './nullable'
import { ObjectArbitrary } from './object'
import { PrimitivesArbitrary } from './primitives'
import { RecordArbitrary } from './record'
import { RecursiveArbitrary } from './recursive'
import { RefinementArbitrary } from './refinement'
import { SetArbitrary } from './set'
import { SumArbitrary } from './sum'

export const _allArbitraryInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesArbitrary<Env>(),
    RefinementArbitrary<Env>(),
    RecordArbitrary<Env>(),
    ObjectArbitrary<Env>(),
    NewtypeArbitrary<Env>(),
    RecursiveArbitrary<Env>(),
    SetArbitrary<Env>(),
    SumArbitrary<Env>(),
    NullableArbitrary<Env>(),
    IntersectionArbitrary<Env>()
  )

export const allArbitraryInterpreters = memoize(_allArbitraryInterpreters) as typeof _allArbitraryInterpreters

export function deriveFor<Su extends Summoner<any>>(_S: Su) {
  return (
    env: {
      [K in ArbURI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
    }
  ) => <S, R, E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, S, R, E, A>): Arbitrary<A> =>
    pipe(env, F.derive(allArbitraryInterpreters()))
}
