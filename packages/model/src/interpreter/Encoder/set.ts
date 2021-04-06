import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import { flow, pipe } from '@principia/base/function'
import * as Set from '@principia/base/Set'
import * as S from '@principia/io/Sync'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const SetEncoder = implementInterpreter<EncoderURI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)({ encode: flow(Set.toArray(ord), S.foreach(encoder.encode)) }, env, encoder)
    )
}))
