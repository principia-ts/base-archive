import type * as Alg from '../../algebra'
import type { ArbURI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const IntersectionArbitrary = implementInterpreter<ArbURI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (arbs) =>
        applyArbitraryConfig(config?.config)(
          accessFastCheck(env)
            .genericTuple(arbs as any)
            .map((all) => Object.assign({}, ...all)),
          env,
          arbs as any
        )
    )
}))
