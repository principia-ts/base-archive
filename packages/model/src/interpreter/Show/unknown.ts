import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const UnknownShow = implementInterpreter<URI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyShowConfig(config?.config)(S.any, env, {})
}))
