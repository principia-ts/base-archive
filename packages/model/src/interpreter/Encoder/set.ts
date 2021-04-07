import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import * as Enc from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const SetEncoder = implementInterpreter<EncoderURI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) => {
    const encoder = a(env)
    return applyEncoderConfig(config?.config)(Enc.SetToArray(encoder, ord), env, encoder)
  }
}))
