import type * as Alg from "../../algebra";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import * as S from "@principia/base/data/Show";

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
