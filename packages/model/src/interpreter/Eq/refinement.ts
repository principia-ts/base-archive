import type * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const RefinementEq = implementInterpreter<Eq.URI, Alg.RefinementURI>()((_) => ({
  refine_: (a, _, __, config) => (env) =>
    pipe(a(env), (eq) => applyEqConfig(config?.config)(eq, env, {})),
  constrain: (a, _, __, config) => (env) =>
    pipe(a(env), (eq) => applyEqConfig(config?.config)(eq, env, {}))
}));
