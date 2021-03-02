import type * as Alg from '../../algebra'
import type { EqURI } from './HKT'

import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'

import { implementInterpreter } from '../../HKT'
import { applyEqConfig } from './HKT'

export const NewtypeEq = implementInterpreter<EqURI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (eq) => applyEqConfig(config?.config)(Eq.contramap_(eq, iso.reverseGet), env, eq)),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (eq) => applyEqConfig(config?.config)(Eq.contramap_(eq, prism.reverseGet), env, eq))
}))
