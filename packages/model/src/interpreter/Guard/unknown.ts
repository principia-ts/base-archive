import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const UnknownGuard = implementInterpreter<URI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyGuardConfig(config?.config)(G.id<unknown>(), env, {})
}))
