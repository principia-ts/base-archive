import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as S from '@principia/base/Set'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const SetEq = implementInterpreter<EqURI, Alg.SetURI>()((_) => ({
  set: (a, _, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(S.getEq(eq), env, eq))
}))
