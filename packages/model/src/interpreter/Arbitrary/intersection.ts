import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const IntersectionArbitrary = implementInterpreter<ArbitraryURI, Alg.IntersectionURI>()((_) => ({
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
