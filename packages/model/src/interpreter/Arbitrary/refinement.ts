import type * as Alg from '../../algebra'
import type { ArbURI } from './HKT'

import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyArbitraryConfig } from './HKT'

export const RefinementArbitrary = implementInterpreter<ArbURI, Alg.RefinementURI>()((_) => ({
  refine_: (a, refinement, name, config) => (env) =>
    pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(arb.filter(refinement), env, {})),
  constrain: (a, predicate, name, config) => (env) =>
    pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(arb.filter(predicate), env, {}))
}))
