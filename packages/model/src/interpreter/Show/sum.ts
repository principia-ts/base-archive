import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const SumShow = implementInterpreter<ShowURI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((f) => f(env)),
      (shows) => applyShowConfig(config?.config)(S.named_(S.sum_(tag, shows), config?.label), env, shows as any)
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyShowConfig(config?.config)(S.named_(E.getShow(l, r), config?.label), env, {
          left: l,
          right: r
        })
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(S.named_(O.getShow(show), config?.label), env, show))
}))
