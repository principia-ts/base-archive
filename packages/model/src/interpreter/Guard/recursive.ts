import type * as Alg from "../../algebra";

import { pipe } from "@principia/base/data/Function";
import * as G from "@principia/base/data/Guard";

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
