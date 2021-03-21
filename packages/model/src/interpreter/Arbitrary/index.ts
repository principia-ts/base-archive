import type { Model } from '../../abstract/Model'
import type { SummonerEnv, SummonerPURI, SummonerRURI } from '../../abstract/Summoner'
import type { AnyEnv } from '../../HKT'
import type { Summoner } from '../../summoner'
import type { Arbitrary } from 'fast-check'

import { pipe } from '@principia/base/function'

import { memoize, merge } from '../../utils'
import { ArbitraryURI } from './HKT'
import { IntersectionArbitrary } from './intersection'
import { NewtypeArbitrary } from './newtype'
import { NullableArbitrary } from './nullable'
import { PrimitivesArbitrary } from './primitives'
import { RecordArbitrary } from './record'
import { RecursiveArbitrary } from './recursive'
import { RefinementArbitrary } from './refinement'
import { SetArbitrary } from './set'
import { ObjectArbitrary } from './struct'
import { SumArbitrary } from './sum'
import { UnknownArbitrary } from './unknown'

export { ArbitraryURI }

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
    IntersectionArbitrary<Env>(),
    UnknownArbitrary<Env>()
  )

export const allArbitraryInterpreters = memoize(_allArbitraryInterpreters) as typeof _allArbitraryInterpreters

export function deriveFor<Su extends Summoner<any>>(_S: Su) {
  return (
    env: {
      [K in ArbitraryURI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
    }
  ) => <E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, E, A>): Arbitrary<A> =>
    pipe(env, F.derive(allArbitraryInterpreters()))
}
