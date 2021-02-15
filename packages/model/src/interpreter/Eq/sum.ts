import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as E from '@principia/base/Either'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const SumEq = implementInterpreter<URI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((t) => t(env)),
      (eqs) => applyEqConfig(config?.config)(Eq.sum_(tag, eqs), env, eqs as any)
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) => applyEqConfig(config?.config)(E.getEq(l, r), env, { left: l, right: r }))
    ),
  option: (a, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(O.getEq(eq), env, eq))
}))
