import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as S from '@principia/base/Set'
import * as Show from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const SetShow = implementInterpreter<ShowURI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(Show.named_(S.getShow(show), config?.label), env, show))
}))
