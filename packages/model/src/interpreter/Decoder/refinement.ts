import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import * as O from '@principia/base/Option'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const RefinementDecoder = implementInterpreter<DecoderURI, Alg.RefinementURI>()((_) => ({
  refine: (decoder, refinement, onError, config) => (env) => {
    const d = decoder(env)
    return applyDecoderConfig(config?.config)(
      withConfig(config)(D.refine_(d, refinement, onError, () => O.None(), config?.label ?? d.label)),
      env,
      { d }
    )
  },
  constrain: (decoder, predicate, onError, config) => (env) => {
    const d = decoder(env)
    return applyDecoderConfig(config?.config)(
      withConfig(config)(
        D.refine_(
          d,
          (a): a is typeof a => predicate(a),
          onError,
          () => O.None(),
          config?.label ?? d.label
        )
      ),
      env,
      { d }
    )
  }
}))
