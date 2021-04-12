import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as S from '@principia/base/Sync'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const NullableEncoder = implementInterpreter<EncoderURI, Alg.NullableURI>()((_) => ({
  nullable: (a, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(E.nullable(encoder), env, encoder)),
  optional: (a, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)({ encode: O.match(() => S.succeed(null), encoder.encode) }, env, encoder)
    )
}))
