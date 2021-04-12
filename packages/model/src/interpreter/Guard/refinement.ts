import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const RefinementGuard = implementInterpreter<GuardURI, Alg.RefinementURI>()((_) => ({
  refine: (a, refinement, _, config) => (env) =>
    pipe(a(env), (guard) => applyGuardConfig(config?.config)(pipe(guard, G.refine(refinement)), env, {})),
  constrain: (a, predicate, _, config) => (env) =>
    pipe(a(env), (guard) =>
      applyGuardConfig(config?.config)(
        pipe(
          guard,
          G.refine((a): a is typeof a => predicate(a))
        ),
        env,
        {}
      )
    )
}))
