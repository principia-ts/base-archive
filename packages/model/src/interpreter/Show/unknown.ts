import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const UnknownShow = implementInterpreter<ShowURI, Alg.UnknownURI>()((_) => ({
  unknown: (config) => (env) => applyShowConfig(config?.config)(S.any, env, {})
}))
