import type * as Alg from "../../algebra";
import type { URI } from "./HKT";

import { pipe } from "@principia/base/data/Function";
import * as D from "@principia/codec/Decoder";

import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const RefinementDecoder = implementInterpreter<URI, Alg.RefinementURI>()((_) => ({
  refine_: (decoder, refinement, name, config) => (env) =>
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
