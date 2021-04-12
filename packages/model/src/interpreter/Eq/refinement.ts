import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'
import type * as Eq from '@principia/base/Eq'

import { pipe } from '@principia/base/function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const RefinementEq = implementInterpreter<EqURI, Alg.RefinementURI>()((_) => ({
  refine: (a, _, __, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(eq, env, {})),
  constrain: (a, _, __, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(eq, env, {}))
}))
