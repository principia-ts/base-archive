import type * as Alg from '../../algebra'
import type { ArbURI } from './HKT'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const UnknownArbitrary = implementInterpreter<ArbURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).anything(), env, {})
}))
