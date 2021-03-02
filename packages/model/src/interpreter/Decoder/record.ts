import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as D from '@principia/codec/DecoderKF'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const RecordDecoder = implementInterpreter<DecoderURI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (decoder) =>
      applyDecoderConfig(config?.config)(D.record(decoder, extractInfo(config)), env, decoder)
    )
}))
