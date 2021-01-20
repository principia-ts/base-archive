import type * as Alg from '../../algebra'

import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const UnknownGuard = implementInterpreter<G.URI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyGuardConfig(config?.config)(G.id<unknown>(), env, {})
}))
