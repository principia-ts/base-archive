import type * as Alg from '../../algebra'
import type { URI } from './HKT'
import type * as E from '@principia/codec/Encoder'

import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const RefinementEncoder = implementInterpreter<URI, Alg.RefinementURI>()((_) => ({
  refine_: (a, refinement, name, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(encoder, env, encoder)),
  constrain: (a, predicate, name, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(encoder, env, encoder))
}))
