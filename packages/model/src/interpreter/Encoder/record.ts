import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const RecordEncoder = implementInterpreter<URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (encoder) => applyEncoderConfig(config?.config)(E.record(encoder), env, encoder))
}))
