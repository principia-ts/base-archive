import type * as Alg from '../../algebra'
import type { URI } from './HKT'
import type * as Eq from '@principia/base/Eq'

import { pipe } from '@principia/base/Function'
import * as S from '@principia/base/Set'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const SetEq = implementInterpreter<URI, Alg.SetURI>()((_) => ({
  set: (a, _, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(S.getEq(eq), env, eq))
}))
