import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'

import * as D from '@principia/codec/DecoderK'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'

export const UnknownDecoder = implementInterpreter<DecoderKURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyDecoderConfig(config?.config)(D.id<unknown>(), env, {})
}))
