import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/DecoderK'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const NullableDecoder = implementInterpreter<DecoderKURI, Alg.NullableURI>()((_) => ({
  nullable_: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(D.nullable(extractInfo(config))(decoder), env, decoder)
    ),

  optional_: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(D.optional(extractInfo(config))(decoder), env, decoder)
    )
}))
