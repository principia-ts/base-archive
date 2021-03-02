import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import * as Enc from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const UnknownEncoder = implementInterpreter<EncoderURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyEncoderConfig(config?.config)(Enc.id<unknown>(), env, {})
}))
