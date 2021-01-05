import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/data/Function'
import * as D from '@principia/codec/DecoderKF'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const NullableDecoder = implementInterpreter<URI, Alg.NullableURI>()((_) => ({
  nullable_: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(D.nullable(extractInfo(config))(decoder), env, decoder)
    ),

  optional_: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(D.optional(extractInfo(config))(decoder), env, decoder)
    )
}))
