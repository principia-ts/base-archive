import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const SetDecoder = implementInterpreter<DecoderURI, Alg.SetURI>()((_) => ({
  set: (a, O, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(D.SetFromArray(decoder, O), withConfig(config)),
        env,
        decoder
      )
    )
}))
