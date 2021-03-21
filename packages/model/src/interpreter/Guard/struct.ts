import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const ObjectGuard = implementInterpreter<GuardURI, Alg.StructURI>()((_) => ({
  struct: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (guards) => applyGuardConfig(config?.config)(G.struct(guards) as any, env, guards as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (guards) => applyGuardConfig(config?.config)(G.partial(guards) as any, env, guards as any)
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
            applyGuardConfig(config?.config)(G.intersect(G.struct(r))(G.partial(o)) as any, env, {
              required: r as any,
              optional: o as any
            })
        )
    )
}))
