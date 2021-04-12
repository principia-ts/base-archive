import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as R from '@principia/base/Record'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const ObjectDecoder = implementInterpreter<DecoderURI, Alg.StructURI>()((_) => ({
  struct: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(withConfig(config)(D.struct(decoders)) as any, env, decoders as any)
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(withConfig(config)(D.partial(decoders)) as any, env, decoders as any)
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
            applyDecoderConfig(config?.config)(
              pipe(D.intersect(D.struct(r), D.partial(o)), withConfig(config)) as any,
              env,
              {
                required: r as any,
                optional: o as any
              }
            )
        )
    ) as any
}))
