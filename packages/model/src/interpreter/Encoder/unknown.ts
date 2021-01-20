import type * as Alg from '../../algebra'

import * as Enc from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const UnknownEncoder = implementInterpreter<Enc.URI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyEncoderConfig(config?.config)(Enc.id<unknown>(), env, {})
}))
