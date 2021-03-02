import type * as Alg from '../../algebra'
import type { ShowURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as S from '@principia/base/Show'

import { implementInterpreter } from '../../HKT'
import { applyShowConfig } from './HKT'

export const NewtypeShow = implementInterpreter<ShowURI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(S.contramap_(show, iso.reverseGet), env, show)),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (show) => applyShowConfig(config?.config)(S.contramap_(show, prism.reverseGet), env, show))
}))
