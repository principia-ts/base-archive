import { pipe } from "@principia/core/Function";

import * as D from "../../../Decoder";
import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const RecordDecoder = implementInterpreter<D.URI, Alg.RecordURI>()((_) => ({
   record: (codomain, config) => (env) =>
      pipe(codomain(env), (decoder) =>
         applyDecoderConfig(config?.config)(D.record(decoder, extractInfo(config)), env, decoder)
      )
}));
