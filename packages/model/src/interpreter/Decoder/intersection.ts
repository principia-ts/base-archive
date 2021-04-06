import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as NA from '@principia/base/NonEmptyArray'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const IntersectionDecoder = implementInterpreter<DecoderURI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      NA.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(
          withConfig(config)(D.intersect(...(decoders as any)) as any),
          env,
          decoders as any
        )
    )
}))
