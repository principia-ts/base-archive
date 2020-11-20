import * as D from "@principia/core/Decoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const NullableDecoder = implementInterpreter<URI, Alg.NullableURI>()((_) => ({
  nullable_: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) => D.nullable(M)(extractInfo(config))(decoder(M)),
        env,
        decoder
      )
    ),

  optional_: (a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) => D.optional(M)(extractInfo(config))(decoder(M)),
        env,
        decoder
      )
    )
}));
