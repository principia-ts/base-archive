import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'

import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const NullableEq = implementInterpreter<EqURI, Alg.NullableURI>()((_) => ({
  nullable: (a, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(Eq.nullable(eq), env, eq)),
  optional: (a, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(O.getEq(eq), env, eq))
}))
