import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const IntersectionShow = implementInterpreter<ShowURI, Alg.IntersectionURI>()((_) => ({
  intersection: (...types) => (config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (shows) =>
        applyShowConfig(config?.config)(
          {
            show: (a) => A.map_(shows, (s) => s.show(a)).join(' & ')
          },
          env,
          shows as any
        )
    )
}))
