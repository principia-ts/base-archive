import * as D from "@principia/core/Decoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const RefinementDecoder = implementInterpreter<URI, Alg.RefinementURI>()((_) => ({
  refine: (decoder, refinement, name, config) => (env) =>
    applyDecoderConfig(config?.config)(
      (M) => pipe(decoder(env)(M), D.refine(M)(refinement, name, extractInfo(config))),
      env,
      {}
    ),
  constrain: (decoder, predicate, name, config) => (env) =>
    applyDecoderConfig(config?.config)(
      (M) =>
        pipe(
          decoder(env)(M),
          D.refine(M)((a): a is typeof a => predicate(a), name, extractInfo(config))
        ),
      env,
      {}
    )
}));
