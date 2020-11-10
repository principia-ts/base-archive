import { pipe } from "@principia/core/Function";
import * as G from "@principia/core/Guard";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyGuardConfig } from "./HKT";

export const RefinementGuard = implementInterpreter<G.URI, Alg.RefinementURI>()((_) => ({
   refine: (a, refinement, _, config) => (env) =>
      pipe(a(env), (guard) => applyGuardConfig(config?.config)(pipe(guard, G.refine(refinement)), env, {})),
   constrain: (a, predicate, _, config) => (env) =>
      pipe(a(env), (guard) =>
         applyGuardConfig(config?.config)(
            pipe(
               guard,
               G.refine((a): a is typeof a => predicate(a))
            ),
            env,
            {}
         )
      )
}));
