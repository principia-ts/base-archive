import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const RefinementShow = implementInterpreter<ShowURI, Alg.RefinementURI>()((_) => ({
  refine: (a, refinement, onError, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(S.named_(show, config?.label), env, {})),
  constrain: (a, predicate, onError, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(S.named_(show, config?.label), env, {}))
}))
