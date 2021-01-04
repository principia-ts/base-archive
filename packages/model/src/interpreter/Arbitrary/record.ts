import type * as Alg from '../../algebra'
import type { ArbURI } from './HKT'

import * as A from '@principia/base/data/Array'
import { pipe } from '@principia/base/data/Function'
import * as R from '@principia/base/data/Record'
import { getFirstSemigroup } from '@principia/base/Semigroup'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const RecordArbitrary = implementInterpreter<ArbURI, Alg.RecordURI>()((_) => ({
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
