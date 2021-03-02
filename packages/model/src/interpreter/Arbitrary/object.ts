import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const ObjectArbitrary = implementInterpreter<ArbitraryURI, Alg.ObjectURI>()((_) => ({
  type: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (arbs) => applyArbitraryConfig(config?.config)(accessFastCheck(env).record(arbs) as any, env, arbs as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (arbs) =>
        applyArbitraryConfig(config?.config)(
          accessFastCheck(env).record(arbs, { withDeletedKeys: true }) as any,
          env,
          arbs as any
        )
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
            applyArbitraryConfig(config?.config)(
              accessFastCheck(env)
                .record(r)
                .chain((r) =>
                  accessFastCheck(env)
                    .record(o, { withDeletedKeys: true })
                    .map((p) => ({ ...r, ...p }))
                ) as any,
              env,
              { required: r as any, optional: o as any }
            )
        )
    )
}))
