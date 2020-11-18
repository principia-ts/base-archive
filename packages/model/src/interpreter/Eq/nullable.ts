import * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const NullableEq = implementInterpreter<Eq.URI, Alg.NullableURI>()((_) => ({
  nullable: (a, config) => (env) =>
    pipe(a(env), (eq) => applyEqConfig(config?.config)(Eq.nullable(eq), env, eq)),
  optional: (a, config) => (env) =>
    pipe(a(env), (eq) => applyEqConfig(config?.config)(O.getEq(eq), env, eq))
}));
