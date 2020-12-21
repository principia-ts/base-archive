import type * as Alg from "../../algebra";
import type * as S from "@principia/base/data/Show";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";

import { implementInterpreter } from "../../HKT";
import { applyShowConfig } from "./HKT";

export const IntersectionShow = implementInterpreter<S.URI, Alg.IntersectionURI>()((_) => ({
  intersection: (types, config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (shows) =>
        applyShowConfig(config?.config)(
          {
            show: (a) => A.map_(shows, (s) => s.show(a)).join(" & ")
          },
          env,
          shows as any
        )
    )
}));
