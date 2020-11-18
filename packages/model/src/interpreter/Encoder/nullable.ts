import * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const NullableEncoder = implementInterpreter<E.URI, Alg.NullableURI>()((_) => ({
  nullable: (a, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)(E.nullable(encoder), env, encoder)
    ),
  optional: (a, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)(
        { encode: O.fold(() => undefined, encoder.encode) },
        env,
        encoder
      )
    )
}));
