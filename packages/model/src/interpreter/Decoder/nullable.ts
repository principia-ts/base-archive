import * as D from "@principia/core/Decoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const NullableDecoder = implementInterpreter<D.URI, Alg.NullableURI>()((_) => ({
   nullable: (a, config) => (env) =>
      pipe(a(env), (decoder) =>
         applyDecoderConfig(config?.config)(D.nullable(extractInfo(config))(decoder), env, decoder)
      ),

   optional: (a, config) => (env) =>
      pipe(a(env), (decoder) =>
         applyDecoderConfig(config?.config)(D.optional(extractInfo(config))(decoder), env, decoder)
      )
}));
