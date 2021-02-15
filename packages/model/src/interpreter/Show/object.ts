import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const ObjectShow = implementInterpreter<URI, Alg.ObjectURI>()((_) => ({
  type: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (shows) => applyShowConfig(config?.config)(S.named_(S.type(shows), config?.name) as any, env, shows as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (shows) => applyShowConfig(config?.config)(S.named_(S.partial(shows), config?.name) as any, env, shows as any)
    ),
  both: (required, optional, config) => (env) =>
    pipe(
      required,
      R.map((f) => f(env)),
      (r) =>
        pipe(
          optional,
          R.map((f) => f(env)),
          (o) =>
            applyShowConfig(config?.config)(S.named_(S.intersect_(S.type(r), S.partial(o)), config?.name), env, {
              required: r as any,
              optional: o as any
            })
        )
    )
}))
