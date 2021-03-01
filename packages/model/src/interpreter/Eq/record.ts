import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const RecordEq = implementInterpreter<URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (eq) => applyEqConfig(config?.config)(R.getEq(eq), env, eq))
}))
