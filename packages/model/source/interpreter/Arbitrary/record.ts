import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";
import * as R from "@principia/core/Record";
import { getFirstSemigroup } from "@principia/prelude";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { ArbURI } from "./HKT";
import { accessFastCheck, applyArbitraryConfig } from "./HKT";

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
}));
