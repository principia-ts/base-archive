import type * as Alg from '../../algebra'

import { pipe } from '@principia/base/Function'
import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const RecordGuard = implementInterpreter<G.URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (guard) => applyGuardConfig(config?.config)(G.record(guard), env, guard))
}))
