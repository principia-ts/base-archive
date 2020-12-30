import type * as Alg from '../../algebra'
import type { ArbURI } from './HKT'

import { isNonEmpty } from '@principia/base/data/Array'
import * as A from '@principia/base/data/Array'
import { pipe } from '@principia/base/data/Function'
import * as R from '@principia/base/data/Record'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const PrimitivesArbitrary = implementInterpreter<ArbURI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).string(), env, {}),
  number: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).float(), env, {}),
  boolean: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).boolean(), env, {}),
  literal: (...values) => (config) => (env) =>
    applyArbitraryConfig(config?.config)(accessFastCheck(env).constantFrom(...values), env, {}),
  stringLiteral: (value, config) => (env) =>
    applyArbitraryConfig(config?.config)(accessFastCheck(env).constant(value), env, {}),
  numberLiteral: (value, config) => (env) =>
    applyArbitraryConfig(config?.config)(accessFastCheck(env).constant(value), env, {}),
  bigint: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).bigInt(), env, {}),
  date: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).date(), env, {}),
  array: (item, config) => (env) =>
    pipe(item(env), (arb) => applyArbitraryConfig(config?.config)(accessFastCheck(env).array(arb), env, arb)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (arb) =>
      applyArbitraryConfig(config?.config)(accessFastCheck(env).array(arb).filter(isNonEmpty) as any, env, arb)
    ),
  keyof: (keys, config) => (env) =>
    applyArbitraryConfig(config?.config)(
      accessFastCheck(env).oneof(...pipe(keys, R.keys, A.map(accessFastCheck(env).constant))),
      env,
      {}
    ),
  UUID: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).uuid() as any, env, {})
}))
