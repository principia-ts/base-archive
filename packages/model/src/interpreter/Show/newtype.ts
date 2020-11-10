import { pipe } from "@principia/core/Function";
import * as S from "@principia/core/Show";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyShowConfig } from "./HKT";

export const NewtypeShow = implementInterpreter<S.URI, Alg.NewtypeURI>()((_) => ({
   newtypeIso: (iso, a, config) => (env) =>
      pipe(a(env), (show) => applyShowConfig(config?.config)(S.contramap_(show, iso.reverseGet), env, show)),
   newtypePrism: (prism, a, config) => (env) =>
      pipe(a(env), (show) => applyShowConfig(config?.config)(S.contramap_(show, prism.reverseGet), env, show))
}));
