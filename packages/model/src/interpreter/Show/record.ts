import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const RecordShow = implementInterpreter<URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (show) => applyShowConfig(config?.config)(S.named_(S.record(show), config?.name), env, show))
}))
