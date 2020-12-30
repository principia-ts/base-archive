import type * as Alg from '../../algebra'

import { pipe } from '@principia/base/data/Function'
import * as S from '@principia/base/data/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const RecordShow = implementInterpreter<S.URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (show) => applyShowConfig(config?.config)(S.named_(S.record(show), config?.name), env, show))
}))
