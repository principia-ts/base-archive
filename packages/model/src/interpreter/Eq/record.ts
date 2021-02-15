import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const RecordEq = implementInterpreter<URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (eq) => applyEqConfig(config?.config)(Eq.record(eq), env, eq))
}))
