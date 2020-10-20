import { pipe } from "@principia/core/Function";

import * as D from "../../../Decoder";
import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const RefinementDecoder = implementInterpreter<D.URI, Alg.RefinementURI>()((_) => ({
   refine: (decoder, refinement, name, config) => (env) =>
      applyDecoderConfig(config?.config)(pipe(decoder(env), D.refine(refinement, name, extractInfo(config))), env, {}),
   constrain: (decoder, predicate, name, config) => (env) =>
      applyDecoderConfig(config?.config)(
         pipe(
            decoder(env),
            D.refine((a): a is typeof a => predicate(a), name, extractInfo(config))
         ),
         env,
         {}
      )
}));
