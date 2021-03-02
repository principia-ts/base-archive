import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'

import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const UnknownGuard = implementInterpreter<GuardURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyGuardConfig(config?.config)(G.id<unknown>(), env, {})
}))
