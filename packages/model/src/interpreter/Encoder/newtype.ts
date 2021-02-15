import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const NewtypeEncoder = implementInterpreter<URI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(E.contramap_(encoder, iso.reverseGet), env, encoder)),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(E.contramap_(encoder, prism.reverseGet), env, encoder))
}))
