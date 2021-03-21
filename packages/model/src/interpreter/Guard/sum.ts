import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'

import { pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const SumGuard = implementInterpreter<GuardURI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((f) => f(env)),
      (guards) => applyGuardConfig(config?.config)(G.sum(tag)(guards), env, guards as any)
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyGuardConfig(config?.config)(
          {
            is: (u): u is Either<G.TypeOf<typeof l>, G.TypeOf<typeof r>> =>
              typeof u === 'object' &&
              u !== null &&
              '_tag' in u &&
              ((u['_tag'] === 'Left' && l.is(u['left'])) || (u['_tag'] === 'Right' && r.is(u['right'])))
          },
          env,
          { left: l, right: r }
        )
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (guard) =>
      applyGuardConfig(config?.config)(
        {
          is: (u): u is Option<G.TypeOf<typeof guard>> =>
            typeof u === 'object' &&
            u !== null &&
            '_tag' in u &&
            ((u['_tag'] === 'Some' && guard.is(u['value'])) || u['_tag'] === 'None')
        },
        env,
        guard
      )
    )
}))
