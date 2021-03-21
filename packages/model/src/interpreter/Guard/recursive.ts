import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyGuardConfig } from './HKT'

export const RecursiveGuard = implementInterpreter<GuardURI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, a, config) => {
    const get                       = memoize<void, ReturnType<typeof a>>(() => a(res))
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env),
        (getGuard) => applyGuardConfig(config?.config)(G.lazy(getGuard), env, {})
      )
    return res
  }
}))
