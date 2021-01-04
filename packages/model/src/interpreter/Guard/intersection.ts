import type * as Alg from '../../algebra'

import * as A from '@principia/base/data/Array'
import { pipe } from '@principia/base/data/Function'
import * as G from '@principia/base/data/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const IntersectionGuard = implementInterpreter<G.URI, Alg.IntersectionURI>()((_) => ({
  intersection: (types, config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (guards) =>
        applyGuardConfig(config?.config)(
          A.foldLeft_(guards, G.id(), (b, a) => G.intersect(a)(b)) as any,
          env,
          guards as any
        )
    )
}))
