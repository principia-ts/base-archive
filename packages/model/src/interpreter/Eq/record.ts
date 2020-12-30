import type * as Alg from '../../algebra'

import * as Eq from '@principia/base/data/Eq'
import { pipe } from '@principia/base/data/Function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const RecordEq = implementInterpreter<Eq.URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (eq) => applyEqConfig(config?.config)(Eq.record(eq), env, eq))
}))
