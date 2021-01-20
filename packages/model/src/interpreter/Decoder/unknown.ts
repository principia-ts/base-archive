import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as D from '@principia/codec/DecoderKF'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'

export const UnknownDecoder = implementInterpreter<URI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyDecoderConfig(config?.config)(D.id<unknown>(), env, {})
}))
