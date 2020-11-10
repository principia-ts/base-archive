import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { ArbURI } from "./HKT";
import { accessFastCheck, applyArbitraryConfig } from "./HKT";

export const IntersectionArbitrary = implementInterpreter<ArbURI, Alg.IntersectionURI>()((_) => ({
   intersection: (types, config) => (env) =>
      pipe(
         types,
         A.map((f) => f(env)),
         (arbs) =>
            applyArbitraryConfig(config?.config)(
               accessFastCheck(env)
                  .genericTuple(arbs as any)
                  .map((all) => Object.assign({}, ...all)),
               env,
               arbs as any
            )
      )
}));
