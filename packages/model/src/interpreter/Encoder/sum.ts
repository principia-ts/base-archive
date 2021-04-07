import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as R from '@principia/base/Record'
import * as Enc from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const SumEncoder = implementInterpreter<EncoderURI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((f) => f(env)),
      (encoders) => applyEncoderConfig(config?.config)(Enc.sum(tag)(encoders) as any, env, encoders as any)
    ),
  either: (left, right, config) => (env) => {
    const l = left(env)
    const r = right(env)
    return applyEncoderConfig(config?.config)(
      Enc.Either(l, r),
      env,
      {
        left: l,
        right: r
      }
    )
  },
  option: (a, config) => (env) => {
    const encoder = a(env)
    return applyEncoderConfig(config?.config)(
      Enc.Option(encoder),
      env,
      encoder
    )
  }
}))
