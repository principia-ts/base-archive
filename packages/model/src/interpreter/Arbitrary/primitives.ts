import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'
import type { Arbitrary } from 'fast-check'

import { isNonEmpty } from '@principia/base/Array'
import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const PrimitivesArbitrary = implementInterpreter<ArbitraryURI, Alg.PrimitivesURI>()((_) => ({
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
  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (arbitraries) =>
        applyArbitraryConfig(config?.config)(
          accessFastCheck(env).tuple(...(arbitraries as [Arbitrary<unknown>])) as any,
          env,
          arbitraries
        )
    ),
  UUID: (config) => (env) => applyArbitraryConfig(config?.config)(accessFastCheck(env).uuid() as any, env, {})
}))
