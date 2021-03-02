import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'

import * as Eq from '@principia/base/Eq'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const UnknownEq = implementInterpreter<EqURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyEqConfig(config?.config)(Eq.any, env, {})
}))
