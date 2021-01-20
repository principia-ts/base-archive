import type * as Alg from '../../algebra'

import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const UnknownShow = implementInterpreter<S.URI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyShowConfig(config?.config)(S.any, env, {})
}))
