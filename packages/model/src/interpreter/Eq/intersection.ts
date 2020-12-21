import type * as Alg from "../../algebra";

import * as A from "@principia/base/data/Array";
import * as Eq from "@principia/base/data/Eq";
import { pipe } from "@principia/base/data/Function";

import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const IntersectionEq = implementInterpreter<Eq.URI, Alg.IntersectionURI>()((_) => ({
  intersection: (types, config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (eqs) =>
        applyEqConfig(config?.config)(
          A.foldLeft_(eqs, Eq.any, (b, a) => Eq.intersect_(b, a)),
          env,
          eqs as any
        )
    )
}));
