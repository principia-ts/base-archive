import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'

import * as A from '@principia/base/Array'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const IntersectionEq = implementInterpreter<EqURI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (eqs) =>
        applyEqConfig(config?.config)(
          A.foldl_(eqs, Eq.EqAlways, (b, a) => Eq.intersect_(b, a)),
          env,
          eqs as any
        )
    )
}))
