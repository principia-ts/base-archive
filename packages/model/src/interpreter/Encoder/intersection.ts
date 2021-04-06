import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const IntersectionEncoder = implementInterpreter<EncoderURI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (encoders) => applyEncoderConfig(config?.config)(E.intersect(...(encoders as any)) as any, env, encoders as any)
    )
}))
