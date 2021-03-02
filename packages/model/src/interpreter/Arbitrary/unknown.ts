import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const UnknownArbitrary = implementInterpreter<ArbitraryURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).anything(), env, {})
}))
