import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/DecoderK'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const RefinementDecoder = implementInterpreter<DecoderKURI, Alg.RefinementURI>()((_) => ({
  refine_: (decoder, refinement, name, config) => (env) =>
    applyDecoderConfig(config?.config)(pipe(decoder(env), D.refine(refinement, name, extractInfo(config))), env, {}),
  constrain: (decoder, predicate, name, config) => (env) =>
    applyDecoderConfig(config?.config)(
      pipe(
        decoder(env),
        D.refine((a): a is typeof a => predicate(a), name, extractInfo(config))
      ),
      env,
      {}
    )
}))
