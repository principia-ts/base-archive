import { pipe } from "@principia/core/Function";
import * as G from "@principia/core/Guard";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { memoize } from "../../utils";
import { applyGuardConfig } from "./HKT";

export const RecursiveGuard = implementInterpreter<G.URI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, a, config) => {
    const get = memoize<void, ReturnType<typeof a>>(() => a(res));
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env),
        (getGuard) => applyGuardConfig(config?.config)(G.lazy(getGuard), env, {})
      );
    return res;
  }
}));
