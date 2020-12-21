import type * as Alg from "../../algebra";
import type * as E from "@principia/decoders/Encoder";

import * as A from "@principia/base/data/Array";
import { flow, pipe } from "@principia/base/data/Function";
import * as S from "@principia/base/data/Set";

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
