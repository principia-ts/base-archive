import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const PrimitivesEq = implementInterpreter<URI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyEqConfig(config?.config)(Eq.string, env, {}),
  number: (config) => (env) => applyEqConfig(config?.config)(Eq.number, env, {}),
  boolean: (config) => (env) => applyEqConfig(config?.config)(Eq.boolean, env, {}),
  literal: (..._) => (config) => (env) => applyEqConfig(config?.config)(Eq.eqStrict, env, {}),
  stringLiteral: (_, config) => (env) => applyEqConfig(config?.config)(Eq.string, env, {}),
  numberLiteral: (_, config) => (env) => applyEqConfig(config?.config)(Eq.number, env, {}),
  bigint: (config) => (env) => applyEqConfig(config?.config)(Eq.eqStrict, env, {}),
  date: (config) => (env) =>
    applyEqConfig(config?.config)(
      pipe(
        Eq.number,
        Eq.contramap((d) => d.getTime())
      ),
      env,
      {}
    ),
  array: (item, config) => (env) => pipe(item(env), (eq) => applyEqConfig(config?.config)(Eq.array(eq), env, eq)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (eq) => applyEqConfig(config?.config)(Eq.array(eq), env, eq)),
  keyof: (_, config) => (env) => applyEqConfig(config?.config)(Eq.eqStrict, env, {}),
  UUID: (config) => (env) => applyEqConfig(config?.config)(Eq.string, env, {})
}))
