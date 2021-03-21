import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyShowConfig } from './HKT'

export const RecursiveShow = implementInterpreter<ShowURI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, a, config) => {
    const get                       = memoize<void, ReturnType<typeof a>>(() => a(res))
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env),
        (getShow) => applyShowConfig(config?.config)(S.lazy(getShow), env, {})
      )
    return res
  }
}))
