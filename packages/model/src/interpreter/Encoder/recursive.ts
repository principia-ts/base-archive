import * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { memoize } from "../../utils";
import { applyEncoderConfig } from "./HKT";

export const RecursiveEncoder = implementInterpreter<E.URI, Alg.RecursiveURI>()((_) => ({
   recursive: (id, a, config) => {
      const get = memoize<void, ReturnType<typeof a>>(() => a(res));
      const res: ReturnType<typeof a> = (env) =>
         pipe(
            () => get()(env),
            (getEncoder) => applyEncoderConfig(config?.config)(E.lazy(getEncoder), env, {})
         );
      return res;
   }
}));
