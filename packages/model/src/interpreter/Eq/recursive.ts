import type * as Alg from '../../algebra'

import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyEqConfig } from './HKT'

export const RecursiveEq = implementInterpreter<Eq.URI, Alg.RecursiveURI>()((_) => ({
  recursive: (_, f, config) => {
    const get = memoize<void, ReturnType<typeof f>>(() => f(res))
    const res: ReturnType<typeof f> = (env) =>
      pipe(
        () => get()(env),
        (getEq) => applyEqConfig(config?.config)(Eq.lazy(getEq), env, {})
      )

    return res
  }
}))
