import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { eqAny } from '@principia/base/Eq'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const UnknownEq = implementInterpreter<URI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyEqConfig(config?.config)(eqAny, env, {})
}))
