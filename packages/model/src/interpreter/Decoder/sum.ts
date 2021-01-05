import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as E from '@principia/base/data/Either'
import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'
import * as R from '@principia/base/data/Record'
import { error } from '@principia/codec/DecodeErrors'
import * as D from '@principia/codec/DecoderKF'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const SumDecoder = implementInterpreter<URI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) => {
    const decoders = R.map_(types, (_) => _(env))
    return applyDecoderConfig(config?.config)(
      D.sum_(
        tag,
        decoders,
        extractInfo(config)
      ),
      env,
      decoders as any
    )
  },
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyDecoderConfig(config?.config)(
            pipe(
              D.UnknownRecord(),
              D.parse((M) => (u) => {
                if ('_tag' in u && ((u['_tag'] === 'Left' && 'left' in u) || (u['_tag'] === 'Right' && 'right' in u))) {
                  if (u['_tag'] === 'Left') {
                    return M.map_(l.decode(M)(u['left']), E.left) as any
                  } else {
                    return M.map_(r.decode(M)(u['right']), E.right)
                  }
                } else {
                  return M.fail(error(u, 'Either', extractInfo(config)))
                }
              }, `Either<${l._meta.name}, ${r._meta.name}>`)
            ),
          env,
          { left: l, right: r }
        )
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
          pipe(
            D.UnknownRecord(),
            D.parse((M) => (u) => {
              if ('_tag' in u && (u['_tag'] === 'None' || (u['_tag'] === 'Some' && 'value' in u))) {
                if (u['_tag'] === 'Some') {
                  return M.map_(decoder.decode(M)(u['value']), O.some)
                } else {
                  return M.pure(O.none())
                }
              } else {
                return M.fail(error(u, 'Option', extractInfo(config)))
              }
            })
          ),
        env,
        decoder
      )
    )
}))
