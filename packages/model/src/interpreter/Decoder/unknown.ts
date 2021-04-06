import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const UnknownDecoder = implementInterpreter<DecoderURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyDecoderConfig(config?.config)(withConfig(config)(D.id<unknown>()), env, {})
}))
