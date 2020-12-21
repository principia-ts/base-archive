import type * as Alg from "../../algebra";

import { pipe } from "@principia/base/data/Function";
import * as S from "@principia/base/data/Set";
import * as Show from "@principia/base/data/Show";

import { implementInterpreter } from "../../HKT";
import { applyShowConfig } from "./HKT";

export const SetShow = implementInterpreter<Show.URI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) =>
    pipe(a(env), (show) =>
      applyShowConfig(config?.config)(Show.named_(S.getShow(show), config?.name), env, show)
    )
}));
