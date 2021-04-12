import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const NullableShow = implementInterpreter<ShowURI, Alg.NullableURI>()((_) => ({
  nullable: (a, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(S.named_(S.nullable(show), config?.label), env, show)),
  optional: (a, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(S.named_(O.getShow(show), config?.label), env, show))
}))
