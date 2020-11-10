import * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { memoize } from "../../utils";
import { applyEqConfig } from "./HKT";

export const RecursiveEq = implementInterpreter<Eq.URI, Alg.RecursiveURI>()((_) => ({
   recursive: (_, f, config) => {
      const get = memoize<void, ReturnType<typeof f>>(() => f(res));
      const res: ReturnType<typeof f> = (env) =>
         pipe(
            () => get()(env),
            (getEq) => applyEqConfig(config?.config)(Eq.lazy(getEq), env, {})
         );

      return res;
   }
}));
