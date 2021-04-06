import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as R from '@principia/base/Record'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const StructShow = implementInterpreter<ShowURI, Alg.StructURI>()((_) => ({
  struct: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (shows) => applyShowConfig(config?.config)(S.named_(S.struct(shows), config?.label) as any, env, shows as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (shows) => applyShowConfig(config?.config)(S.named_(S.partial(shows), config?.label) as any, env, shows as any)
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
            applyShowConfig(config?.config)(S.named_(S.intersect_(S.struct(r), S.partial(o)), config?.label), env, {
              required: r as any,
              optional: o as any
            })
        )
    )
}))
