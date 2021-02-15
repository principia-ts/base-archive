import type * as Alg from '../../algebra'
import type { URI } from './HKT'
import type * as Eq from '@principia/base/Eq'

import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const RefinementEq = implementInterpreter<URI, Alg.RefinementURI>()((_) => ({
  refine_: (a, _, __, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(eq, env, {})),
  constrain: (a, _, __, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(eq, env, {}))
}))
