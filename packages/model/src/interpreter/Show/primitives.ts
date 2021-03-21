import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/boolean'
import * as D from '@principia/base/Date'
import { absurd, pipe } from '@principia/base/function'
import * as N from '@principia/base/number'
import * as Sh from '@principia/base/Show'
import * as S from '@principia/base/string'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const PrimitivesShow = implementInterpreter<ShowURI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyShowConfig(config?.config)(Sh.named_(S.Show, config?.name), env, {}),
  number: (config) => (env) => applyShowConfig(config?.config)(Sh.named_(N.Show, config?.name), env, {}),
  boolean: (config) => (env) => applyShowConfig(config?.config)(Sh.named_(B.Show, config?.name), env, {}),
  literal: (..._) => (config) => (env) =>
    applyShowConfig(config?.config)(
      Sh.named_(
        Sh.makeShow((a) =>
          typeof a === 'number'
            ? N.Show.show(a)
            : typeof a === 'string'
            ? S.Show.show(a)
            : typeof a === 'boolean'
            ? B.Show.show(a)
            : absurd(a as never)
        ),
        config?.name
      ),
      env,
      {}
    ),
  stringLiteral: (value, config) => (env) => applyShowConfig(config?.config)(Sh.named_(S.Show, config?.name), env, {}),
  numberLiteral: (value, config) => (env) => applyShowConfig(config?.config)(Sh.named_(N.Show, config?.name), env, {}),
  bigint: (config) => (env) =>
    applyShowConfig(config?.config)(
      Sh.named_(
        pipe(
          S.Show,
          Sh.contramap((b) => b.toString())
        ),
        config?.name
      ),
      env,
      {}
    ),
  date: (config) => (env) => applyShowConfig(config?.config)(Sh.named_(D.Show, config?.name), env, {}),
  array: (item, config) => (env) =>
    pipe(item(env), (show) => applyShowConfig(config?.config)(Sh.named_(A.getShow(show), config?.name), env, show)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (show) => applyShowConfig(config?.config)(Sh.named_(A.getShow(show), config?.name), env, show)),
  tuple: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (shows) => applyShowConfig(config?.config)(Sh.tuple(...shows) as any, env, shows as any)
    ),
  keyof: (keys, config) => (env) => applyShowConfig(config?.config)(Sh.named_(S.Show, config?.name), env, {}),
  UUID: (config) => (env) => applyShowConfig(config?.config)(Sh.named_(S.Show, config?.name), env, {})
}))
