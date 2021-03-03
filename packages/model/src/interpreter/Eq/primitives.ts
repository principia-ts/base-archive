import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/Boolean'
import * as D from '@principia/base/Date'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import * as N from '@principia/base/Number'
import * as S from '@principia/base/String'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const PrimitivesEq = implementInterpreter<EqURI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyEqConfig(config?.config)(S.Eq, env, {}),
  number: (config) => (env) => applyEqConfig(config?.config)(N.Eq, env, {}),
  boolean: (config) => (env) => applyEqConfig(config?.config)(B.Eq, env, {}),
  literal: (..._) => (config) => (env) => applyEqConfig(config?.config)(Eq.EqStrict, env, {}),
  stringLiteral: (_, config) => (env) => applyEqConfig(config?.config)(S.Eq, env, {}),
  numberLiteral: (_, config) => (env) => applyEqConfig(config?.config)(N.Eq, env, {}),
  bigint: (config) => (env) => applyEqConfig(config?.config)(Eq.EqStrict, env, {}),
  date: (config) => (env) => applyEqConfig(config?.config)(D.Eq, env, {}),
  array: (item, config) => (env) => pipe(item(env), (eq) => applyEqConfig(config?.config)(A.getEq(eq), env, eq)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (eq) => applyEqConfig(config?.config)(A.getEq(eq), env, eq)),
  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (eqs) => applyEqConfig(config?.config)(Eq.tuple(...eqs) as any, env, eqs as any)
    ),
  keyof: (_, config) => (env) => applyEqConfig(config?.config)(Eq.EqStrict, env, {}),
  UUID: (config) => (env) => applyEqConfig(config?.config)(S.Eq, env, {})
}))
