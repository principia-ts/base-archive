import * as A from "@principia/core/Array";
import * as D from "@principia/core/Decoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const IntersectionDecoder = implementInterpreter<URI, Alg.IntersectionURI>()((_) => ({
  intersection: (types, config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(
          (M) => D.intersectAll(M)(decoders.map((_) => _(M)) as any, extractInfo(config)) as any,
          env,
          decoders as any
        )
    )
}));
