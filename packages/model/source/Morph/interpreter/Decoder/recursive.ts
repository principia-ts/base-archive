import { pipe } from "@principia/core/Function";

import * as D from "../../../Decoder";
import { memoize } from "../../../utils";
import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const RecursiveDecoder = implementInterpreter<D.URI, Alg.RecursiveURI>()((_) => ({
   recursive: (id, f, config) => {
      const get = memoize<void, ReturnType<typeof f>>(() => f(res));
      const res: ReturnType<typeof f> = (env) =>
         pipe(
            () => get()(env),
            (getDecoder) => applyDecoderConfig(config?.config)(D.lazy(id, getDecoder, extractInfo(config)), env, {})
         );

      return res;
   }
}));
