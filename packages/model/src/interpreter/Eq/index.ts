import type { Model } from '../../abstract/Model'
import type { SummonerEnv, SummonerPURI, SummonerRURI } from '../../abstract/Summoner'
import type { AnyEnv } from '../../HKT'
import type { Summoner } from '../../summoner'
import type * as Eq from '@principia/base/Eq'

import { pipe } from '@principia/base/function'

import { memoize, merge } from '../../utils'
import { EqURI } from './HKT'
import { IntersectionEq } from './intersection'
import { NewtypeEq } from './newtype'
import { NullableEq } from './nullable'
import { PrimitivesEq } from './primitives'
import { RecordEq } from './record'
import { RecursiveEq } from './recursive'
import { RefinementEq } from './refinement'
import { SetEq } from './set'
import { ObjectEq } from './struct'
import { SumEq } from './sum'
import { UnknownEq } from './unknown'

export { EqURI }

export const _allEqInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesEq<Env>(),
    RefinementEq<Env>(),
    RecordEq<Env>(),
    ObjectEq<Env>(),
    NewtypeEq<Env>(),
    RecursiveEq<Env>(),
    SetEq<Env>(),
    SumEq<Env>(),
    NullableEq<Env>(),
    IntersectionEq<Env>(),
    UnknownEq<Env>()
  )

export const allEqInterpreters = memoize(_allEqInterpreters) as typeof _allEqInterpreters

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
  env: {
    [K in EqURI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K]
  }
) => <I, E, A, O>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, I, E, A, O>): Eq.Eq<A> =>
  pipe(env, F.derive(allEqInterpreters()))
