import * as A from "@principia/core/Array";
import type * as E from "@principia/core/Encoder";
import { flow, pipe } from "@principia/core/Function";
import * as S from "@principia/core/Set";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const SetEncoder = implementInterpreter<E.URI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)(
        { encode: flow(S.toArray(ord), A.map(encoder.encode)) },
        env,
        encoder
      )
    )
}));
