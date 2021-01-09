import type * as Alg from '../../algebra'

import { absurd, pipe } from '@principia/base/Function'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const PrimitivesShow = implementInterpreter<S.URI, Alg.PrimitivesURI>()((_) => ({
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
    pipe(item(env), (show) => applyShowConfig(config?.config)(S.named_(S.array(show), config?.name), env, show)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (show) => applyShowConfig(config?.config)(S.named_(S.array(show), config?.name), env, show)),
  keyof: (keys, config) => (env) => applyShowConfig(config?.config)(S.named_(S.string, config?.name), env, {}),
  UUID: (config) => (env) => applyShowConfig(config?.config)(S.named_(S.string, config?.name), env, {})
}))
