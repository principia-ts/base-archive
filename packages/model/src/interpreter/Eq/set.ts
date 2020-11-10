import type * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";
import * as S from "@principia/core/Set";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const SetEq = implementInterpreter<Eq.URI, Alg.SetURI>()((_) => ({
   set: (a, _, config) => (env) => pipe(a(env), (eq) => applyEqConfig(config?.config)(S.getEq(eq), env, eq))
}));
