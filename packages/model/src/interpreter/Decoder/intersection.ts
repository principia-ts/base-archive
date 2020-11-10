import * as A from "@principia/core/Array";
import * as D from "@principia/core/Decoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";

export const IntersectionDecoder = implementInterpreter<D.URI, Alg.IntersectionURI>()((_) => ({
   intersection: (types, config) => (env) =>
      pipe(
         types,
         A.map((f) => f(env)),
         (decoders) =>
            applyDecoderConfig(config?.config)(
               D.intersectAll(
                  decoders as readonly [
                     D.Decoder<unknown, any>,
                     D.Decoder<unknown, any>,
                     ...(readonly D.Decoder<unknown, any>[])
                  ],
                  config?.name
               ),
               env,
               decoders as any
            )
      )
}));
