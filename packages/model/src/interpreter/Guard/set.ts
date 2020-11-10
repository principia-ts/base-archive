import { pipe } from "@principia/core/Function";
import * as G from "@principia/core/Guard";
import * as S from "@principia/core/Set";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyGuardConfig } from "./HKT";

export const SetGuard = implementInterpreter<G.URI, Alg.SetURI>()((_) => ({
   set: (a, ord, config) => (env) =>
      pipe(a(env), (guard) =>
         applyGuardConfig(config?.config)(
            pipe(
               G.id(),
               G.refine((u): u is ReadonlySet<G.TypeOf<typeof guard>> => u instanceof Set && S.every_(u, guard.is))
            ),
            env,
            guard
         )
      )
}));
