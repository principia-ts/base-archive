import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const IntersectionGuard = implementInterpreter<URI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (guards) =>
        applyGuardConfig(config?.config)(
          A.foldl_(guards, G.id(), (b, a) => G.intersect(a)(b)) as any,
          env,
          guards as any
        )
    )
}))
