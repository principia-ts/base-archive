import type * as Alg from '../../algebra'
import type { URI } from './HKT'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as G from '@principia/base/Guard'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { regexUUID } from '../Decoder/primitives'
import { applyGuardConfig } from './HKT'

export const PrimitivesGuard = implementInterpreter<URI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyGuardConfig(config?.config)(G.string, env, {}),
  number: (config) => (env) => applyGuardConfig(config?.config)(G.number, env, {}),
  boolean: (config) => (env) => applyGuardConfig(config?.config)(G.boolean, env, {}),
  literal: (...values) => (config) => (env) => applyGuardConfig(config?.config)(G.literal(...values), env, {}),
  stringLiteral: (value, config) => (env) => applyGuardConfig(config?.config)(G.literal(value), env, {}),
  numberLiteral: (value, config) => (env) => applyGuardConfig(config?.config)(G.literal(value), env, {}),
  bigint: (config) => (env) =>
    applyGuardConfig(config?.config)({ is: (u): u is bigint => typeof u === 'bigint' }, env, {}),
  date: (config) => (env) => applyGuardConfig(config?.config)({ is: (u): u is Date => u instanceof Date }, env, {}),
  array: (item, config) => (env) =>
    pipe(item(env), (guard) => applyGuardConfig(config?.config)(G.array(guard), env, guard)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (guard) =>
      applyGuardConfig(config?.config)(
        pipe(
          G.array(guard),
          G.refine((as): as is NonEmptyArray<any> => as.length > 0)
        ),
        env,
        guard
      )
    ),
  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (guards) => applyGuardConfig(config?.config)(G.tuple(...guards) as any, env, guards as any)
    ),
  keyof: (keys, config) => (env) =>
    applyGuardConfig(config?.config)(
      pipe(
        G.string,
        G.refine((k): k is keyof typeof keys & string => R.has_(keys, k))
      ),
      env,
      {}
    ),
  UUID: (config) => (env) =>
    applyGuardConfig(config?.config)(
      pipe(
        G.string,
        G.refine((s): s is Alg.UUID => regexUUID.test(s))
      ),
      env,
      {}
    )
}))
