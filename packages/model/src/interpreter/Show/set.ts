import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as S from '@principia/base/Set'
import * as Show from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const SetShow = implementInterpreter<URI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(Show.named_(S.getShow(show), config?.name), env, show))
}))
