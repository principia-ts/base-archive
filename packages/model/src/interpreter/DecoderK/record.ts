import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/DecoderK'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const RecordDecoder = implementInterpreter<DecoderKURI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (decoder) =>
      applyDecoderConfig(config?.config)(D.record(decoder, extractInfo(config)), env, decoder)
    )
}))
