import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { ArbURI } from "./HKT";
import { accessFastCheck, applyArbitraryConfig } from "./HKT";

export const NullableArbitrary = implementInterpreter<ArbURI, Alg.NullableURI>()((_) => ({
   nullable: (a, config) => (env) =>
      pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(accessFastCheck(env).option(arb), env, arb)),
   optional: (a, config) => (env) =>
      pipe(a(env), (arb) =>
         applyArbitraryConfig(config?.config)(accessFastCheck(env).option(arb).map(O.fromNullable), env, arb)
      )
}));
