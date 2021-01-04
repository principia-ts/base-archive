import type * as Alg from '../../algebra'

import * as E from '@principia/base/data/Either'
import { flow, pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'
import * as R from '@principia/base/data/Record'
import * as Enc from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { applyEncoderConfig } from './HKT'

export const SumEncoder = implementInterpreter<Enc.URI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((f) => f(env)),
      (encoders) => applyEncoderConfig(config?.config)(Enc.sum(tag)(encoders) as any, env, encoders as any)
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyEncoderConfig(config?.config)({ encode: E.fold(flow(l.encode, E.left), flow(r.encode, E.right)) }, env, {
          left: l,
          right: r
        })
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)({ encode: O.map(encoder.encode) }, env, encoder))
}))
