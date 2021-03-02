import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'
import * as D from '@principia/codec/DecoderKF'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const ObjectDecoder = implementInterpreter<DecoderURI, Alg.ObjectURI>()((_) => ({
  type: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(D.type(decoders, extractInfo(config)) as any, env, decoders as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(D.partial(decoders, extractInfo(config)) as any, env, decoders as any)
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
            applyDecoderConfig(config?.config)(pipe(D.type(r), D.intersect(D.partial(o))) as any, env, {
              required: r as any,
              optional: o as any
            })
        )
    )
}))
