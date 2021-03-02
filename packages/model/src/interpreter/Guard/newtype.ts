import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'
import type { Iso } from '@principia/optics/Iso'
import type { Prism } from '@principia/optics/Prism'

import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

type TypeOfIso<X> = X extends Iso<any, infer A> ? A : never
type TypeOfPrism<X> = X extends Prism<any, infer A> ? A : never

export const NewtypeGuard = implementInterpreter<GuardURI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (guard) =>
      applyGuardConfig(config?.config)({ is: (u): u is TypeOfIso<typeof iso> => guard.is(u) }, env, guard)
    ),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (guard) =>
      applyGuardConfig(config?.config)(
        {
          is: (u): u is TypeOfPrism<typeof prism> => guard.is(u) && prism.getOption(u)._tag === 'Some'
        },
        env,
        guard
      )
    )
}))
