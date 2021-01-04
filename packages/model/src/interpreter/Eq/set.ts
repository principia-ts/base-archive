import type * as Alg from '../../algebra'
import type * as Eq from '@principia/base/data/Eq'

import { pipe } from '@principia/base/data/Function'
import * as S from '@principia/base/data/Set'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const SetEq = implementInterpreter<Eq.URI, Alg.SetURI>()((_) => ({
  set: (a, _, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(S.getEq(eq), env, eq))
}))
