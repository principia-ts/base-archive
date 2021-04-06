import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as R from '@principia/base/Record'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const SumDecoder = implementInterpreter<DecoderURI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) => {
    const decoders = R.map_(types, (_) => _(env))
    return applyDecoderConfig(config?.config)(withConfig(config)(D.sum(tag)(decoders)), env, decoders as any)
  },
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyDecoderConfig(config?.config)(withConfig(config)(D.Either(l, r)), env, {
          left: l,
          right: r
        })
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (decoder) => applyDecoderConfig(config?.config)(withConfig(config)(D.Option(decoder)), env, decoder))
}))
