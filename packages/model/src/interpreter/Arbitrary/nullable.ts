import type * as Alg from '../../algebra'
import type { ArbURI } from './HKT'

import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const NullableArbitrary = implementInterpreter<ArbURI, Alg.NullableURI>()((_) => ({
  nullable_: (a, config) => (env) =>
    pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(accessFastCheck(env).option(arb), env, arb)),
  optional_: (a, config) => (env) =>
    pipe(a(env), (arb) =>
      applyArbitraryConfig(config?.config)(accessFastCheck(env).option(arb).map(O.fromNullable), env, arb)
    )
}))
