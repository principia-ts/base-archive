import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const RecordEncoder = implementInterpreter<EncoderURI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (encoder) => applyEncoderConfig(config?.config)(E.record(encoder), env, encoder))
}))
