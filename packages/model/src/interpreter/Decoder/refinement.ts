import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const RefinementDecoder = implementInterpreter<DecoderURI, Alg.RefinementURI>()((_) => ({
  refine: (decoder, refinement, onError, config) => (env) =>
    applyDecoderConfig(config?.config)(pipe(decoder(env), D.refine(refinement, onError), withConfig(config)), env, {}),
  constrain: (decoder, predicate, onError, config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        decoder(env),
        D.refine((a): a is typeof a => predicate(a), onError),
        withConfig(config)
      ),
      env,
      {}
    )
}))
