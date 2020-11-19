import * as D from "@principia/core/Decoder";
import { pipe } from "@principia/core/Function";
import * as R from "@principia/core/Record";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { URI } from "./HKT";
import { applyDecoderConfig } from "./HKT";
import { extractInfo } from "./utils";

export const ObjectDecoder = implementInterpreter<URI, Alg.ObjectURI>()((_) => ({
  type: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(
          (M) =>
            D.type(M)(
              R.map_(decoders, (_) => _(M)),
              extractInfo(config)
            ) as any,
          env,
          decoders as any
        )
    ),
  partial: (properties, config) => (env) =>
    pipe(
      properties,
      R.map((f) => f(env)),
      (decoders) =>
        applyDecoderConfig(config?.config)(
          (M) =>
            D.partial(M)(
              R.map_(decoders, (_) => _(M)),
              extractInfo(config)
            ) as any,
          env,
          decoders as any
        )
    ),
  both: (required, optional, config) => (env) =>
    pipe(
      required,
      R.map((f) => f(env)),
      (r) =>
        pipe(
          required,
          R.map((f) => f(env)),
          (o) =>
            applyDecoderConfig(config?.config)(
              (M) =>
                pipe(
                  D.type(M)(R.map_(r, (_) => _(M))),
                  D.intersect(M)(D.partial(M)(R.map_(o, (_) => _(M))))
                ) as any,
              env,
              {
                required: r as any,
                optional: o as any
              }
            )
        )
    )
}));
