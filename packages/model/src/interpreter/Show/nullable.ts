import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import * as S from "@principia/core/Show";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyShowConfig } from "./HKT";

export const NullableShow = implementInterpreter<S.URI, Alg.NullableURI>()((_) => ({
  nullable_: (a, config) => (env) =>
    pipe(a(env), (show) =>
      applyShowConfig(config?.config)(S.named_(S.nullable(show), config?.name), env, show)
    ),
  optional_: (a, config) => (env) =>
    pipe(a(env), (show) =>
      applyShowConfig(config?.config)(S.named_(O.getShow(show), config?.name), env, show)
    )
}));
