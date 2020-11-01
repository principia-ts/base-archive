import * as A from "@principia/core/Array";
import * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const IntersectionEq = implementInterpreter<Eq.URI, Alg.IntersectionURI>()((_) => ({
   intersection: (types, config) => (env) =>
      pipe(
         types,
         A.map((f) => f(env)),
         (eqs) =>
            applyEqConfig(config?.config)(
               A.reduce_(eqs, Eq.any, (b, a) => Eq.intersect_(b, a)),
               env,
               eqs as any
            )
      )
}));
