import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as Enc from '@principia/codec/Encoder'
import * as S from '@principia/io/Sync'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const SumEncoder = implementInterpreter<EncoderURI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((f) => f(env)),
      (encoders) => applyEncoderConfig(config?.config)(Enc.sum(tag)(encoders) as any, env, encoders as any)
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyEncoderConfig(config?.config)(
          { encode: E.match(flow(l.encode, S.map(E.Left)), flow(r.encode, S.map(E.Right))) },
          env,
          {
            left: l,
            right: r
          }
        )
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)(
        { encode: O.match(() => S.succeed(O.None()), flow(encoder.encode, S.map(O.Some))) },
        env,
        encoder
      )
    )
}))
