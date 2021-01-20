import type * as Alg from '../../algebra'

import * as A from '@principia/base/Array'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const IntersectionEq = implementInterpreter<Eq.URI, Alg.IntersectionURI>()((_) => ({
  intersection: (types, config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (eqs) =>
        applyEqConfig(config?.config)(
          A.foldLeft_(eqs, Eq.eqAny, (b, a) => Eq.intersect_(b, a)),
          env,
          eqs as any
        )
    )
}))
