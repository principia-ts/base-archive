import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'

import { pipe } from '@principia/base/function'

import { implementInterpreter } from '../../HKT'
import { applyArbitraryConfig } from './HKT'

export const RefinementArbitrary = implementInterpreter<ArbitraryURI, Alg.RefinementURI>()((_) => ({
  refine: (a, refinement, name, config) => (env) =>
    pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(arb.filter(refinement), env, {})),
  constrain: (a, predicate, name, config) => (env) =>
    pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(arb.filter(predicate), env, {}))
}))
