import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import * as A from '@principia/base/Array'
import { absurd, pipe } from '@principia/base/Function'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const PrimitivesShow = implementInterpreter<ShowURI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyShowConfig(config?.config)(S.named_(S.string, config?.name), env, {}),
  number: (config) => (env) => applyShowConfig(config?.config)(S.named_(S.number, config?.name), env, {}),
  boolean: (config) => (env) => applyShowConfig(config?.config)(S.named_(S.boolean, config?.name), env, {}),
  literal: (..._) => (config) => (env) =>
    applyShowConfig(config?.config)(
      S.named_(
        S.makeShow((a) =>
          typeof a === 'number' ? S.number.show(a) : typeof a === 'string' ? S.string.show(a) : absurd(a as never)
        ),
        config?.name
      ),
      env,
      {}
    ),
  stringLiteral: (value, config) => (env) => applyShowConfig(config?.config)(S.named_(S.string, config?.name), env, {}),
  numberLiteral: (value, config) => (env) => applyShowConfig(config?.config)(S.named_(S.number, config?.name), env, {}),
  bigint: (config) => (env) =>
    applyShowConfig(config?.config)(
      S.named_(
        pipe(
          S.string,
          S.contramap((b) => b.toString())
        ),
        config?.name
      ),
      env,
      {}
    ),
  date: (config) => (env) =>
    applyShowConfig(config?.config)(
      S.named_(
        pipe(
          S.string,
          S.contramap((d) => d.toISOString())
        ),
        config?.name
      ),
      env,
      {}
    ),
  array: (item, config) => (env) =>
    pipe(item(env), (show) => applyShowConfig(config?.config)(S.named_(A.getShow(show), config?.name), env, show)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (show) => applyShowConfig(config?.config)(S.named_(A.getShow(show), config?.name), env, show)),
  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (shows) => applyShowConfig(config?.config)(S.tuple(...shows) as any, env, shows as any)
    ),
  keyof: (keys, config) => (env) => applyShowConfig(config?.config)(S.named_(S.string, config?.name), env, {}),
  UUID: (config) => (env) => applyShowConfig(config?.config)(S.named_(S.string, config?.name), env, {})
}))
