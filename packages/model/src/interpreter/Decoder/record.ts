import * as D from "@principia/codec/Decoder";
import { pipe } from "@principia/base/data/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const RecordDecoder = implementInterpreter<URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) => D.record(M)(decoder(M), extractInfo(config)),
        env,
        decoder
      )
    )
}));
