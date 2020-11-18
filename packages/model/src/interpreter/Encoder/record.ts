import * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const RecordEncoder = implementInterpreter<E.URI, Alg.RecordURI>()((_) => ({
  record: (codomain, config) => (env) =>
    pipe(codomain(env), (encoder) =>
      applyEncoderConfig(config?.config)(E.record(encoder), env, encoder)
    )
}));
