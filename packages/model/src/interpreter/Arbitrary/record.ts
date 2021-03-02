import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'
import { getFirstSemigroup } from '@principia/base/Semigroup'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const RecordArbitrary = implementInterpreter<ArbitraryURI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (arb) =>
      applyArbitraryConfig(config?.config)(
        accessFastCheck(env)
          .array(accessFastCheck(env).tuple(accessFastCheck(env).string(), arb))
          .map(R.fromFoldable(getFirstSemigroup(), A.Foldable)),
        env,
        arb
      )
    )
}))
