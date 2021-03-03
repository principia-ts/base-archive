import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const RecordGuard = implementInterpreter<GuardURI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (guard) => applyGuardConfig(config?.config)(R.getGuard(guard), env, guard))
}))
