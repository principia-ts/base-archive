import type * as Alg from "../../algebra";
import type { ArbURI } from "./HKT";

import { pipe } from "@principia/base/data/Function";

import { implementInterpreter } from "../../HKT";
import { memoize } from "../../utils";
import { accessFastCheck, applyArbitraryConfig } from "./HKT";

export const RecursiveArbitrary = implementInterpreter<ArbURI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, a, config) => {
    const get = memoize<void, ReturnType<typeof a>>(() => a(res));
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env),
        (getArb) =>
          applyArbitraryConfig(config?.config)(
            accessFastCheck(env)
              .constant(null)
              .chain((_) => getArb()),
            env,
            {}
          )
      );
    return res;
  }
}));
