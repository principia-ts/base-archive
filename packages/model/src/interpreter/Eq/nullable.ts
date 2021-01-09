import type * as Alg from '../../algebra'

import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const NullableEq = implementInterpreter<Eq.URI, Alg.NullableURI>()((_) => ({
  nullable_: (a, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(Eq.nullable(eq), env, eq)),
  optional_: (a, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(O.getEq(eq), env, eq))
}))
