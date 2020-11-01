import { pipe } from "@principia/core/Function";
import * as S from "@principia/core/Set";
import * as Show from "@principia/core/Show";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyShowConfig } from "./HKT";

export const SetShow = implementInterpreter<Show.URI, Alg.SetURI>()((_) => ({
   set: (a, ord, config) => (env) =>
      pipe(a(env), (show) => applyShowConfig(config?.config)(Show.named_(S.getShow(show), config?.name), env, show))
}));
