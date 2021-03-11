import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as D from '@principia/codec/DecoderK'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const IntersectionDecoder = implementInterpreter<DecoderKURI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(
          D.intersectAll(decoders as any, extractInfo(config)) as any,
          env,
          decoders as any
        )
    )
}))
