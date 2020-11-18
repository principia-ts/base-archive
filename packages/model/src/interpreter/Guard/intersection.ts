import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";
import * as G from "@principia/core/Guard";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyGuardConfig } from "./HKT";

export const IntersectionGuard = implementInterpreter<G.URI, Alg.IntersectionURI>()((_) => ({
  intersection: (types, config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (guards) =>
        applyGuardConfig(config?.config)(
          A.reduce_(guards, G.id(), (b, a) => G.intersect(a)(b)) as any,
          env,
          guards as any
        )
    )
}));
