import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'

import { pipe } from '@principia/base/function'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const RecursiveArbitrary = implementInterpreter<ArbitraryURI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, a, config) => {
    const get                       = memoize<void, ReturnType<typeof a>>(() => a(res))
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env),
        (getArb) =>
          applyArbitraryConfig(config?.config)(
            accessFastCheck(env)
              .constant(null)
              .chain((_) => getArb()),
            env,
            {}
          )
      )
    return res
  }
}))
