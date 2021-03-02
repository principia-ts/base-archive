import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const ObjectEncoder = implementInterpreter<EncoderURI, Alg.ObjectURI>()((_) => ({
  type: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (encoders) => applyEncoderConfig(config?.config)(E.type(encoders) as any, env, encoders as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (encoders) => applyEncoderConfig(config?.config)(E.partial(encoders) as any, env, encoders as any)
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
            applyEncoderConfig(config?.config)(E.intersect(E.partial(o))(E.type(r)) as any, env, {
              required: r as any,
              optional: o as any
            })
        )
    )
}))
