import * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const RecordEq = implementInterpreter<Eq.URI, Alg.RecordURI>()((_) => ({
   record: (codomain, config) => (env) =>
      pipe(codomain(env), (eq) => applyEqConfig(config?.config)(Eq.record(eq), env, eq))
}));
