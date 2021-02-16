import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const IntersectionEncoder = implementInterpreter<URI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (encoders) =>
        applyEncoderConfig(config?.config)(
          A.foldl_(encoders, E.id(), (b, a) => E.intersect(a)(b)) as any,
          env,
          encoders as any
        )
    )
}))
