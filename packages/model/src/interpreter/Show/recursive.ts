import { pipe } from "@principia/core/Function";
import * as S from "@principia/core/Show";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { memoize } from "../../utils";
import { applyShowConfig } from "./HKT";

export const RecursiveShow = implementInterpreter<S.URI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, a, config) => {
    const get = memoize<void, ReturnType<typeof a>>(() => a(res));
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env),
        (getShow) => applyShowConfig(config?.config)(S.lazy(getShow), env, {})
      );
    return res;
  }
}));
