import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'

import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const ObjectEq = implementInterpreter<EqURI, Alg.ObjectURI>()((_) => ({
  type: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (eqs) => applyEqConfig(config?.config)(Eq.type(eqs), env, eqs as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (eqs) => applyEqConfig(config?.config)(Eq.partial(eqs), env, eqs as any)
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
            applyEqConfig(config?.config)(pipe(Eq.type(r), Eq.intersect(Eq.partial(o))), env, {
              required: r as any,
              optional: o as any
            })
        )
    )
}))
