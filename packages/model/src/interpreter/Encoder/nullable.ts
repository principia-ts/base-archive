import type * as Alg from "../../algebra";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import * as E from "@principia/codec/Encoder";

import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const NullableEncoder = implementInterpreter<E.URI, Alg.NullableURI>()((_) => ({
  nullable_: (a, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)(E.nullable(encoder), env, encoder)
    ),
  optional_: (a, config) => (env) =>
    pipe(a(env), (encoder) =>
      applyEncoderConfig(config?.config)(
        { encode: O.fold(() => undefined, encoder.encode) },
        env,
        encoder
      )
    )
}));
