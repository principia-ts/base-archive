import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import * as A from '@principia/base/Array'
import { flow, pipe } from '@principia/base/Function'
import * as S from '@principia/base/Set'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const SetEncoder = implementInterpreter<EncoderURI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)({ encode: flow(S.toArray(ord), A.map(encoder.encode)) }, env, encoder)
    )
}))
