import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const NullableDecoder = implementInterpreter<DecoderURI, Alg.NullableURI>()((_) => ({
  nullable: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(withConfig(config)(D.nullable(decoder)), env, decoder)
    ),

  optional: (a, config) => (env) =>
    pipe(a(env), (decoder) => applyDecoderConfig(config?.config)(withConfig(config)(D.optional(decoder)), env, decoder))
}))
