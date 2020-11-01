import * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";
import * as R from "@principia/core/Record";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const ObjectEncoder = implementInterpreter<E.URI, Alg.ObjectURI>()((_) => ({
   type: (properties, config) => (env) =>
      pipe(
         properties,
         R.map((f) => f(env)),
         (encoders) => applyEncoderConfig(config?.config)(E.type(encoders) as any, env, encoders as any)
      ),
   partial: (properties, config) => (env) =>
      pipe(
         properties,
         R.map((f) => f(env)),
         (encoders) => applyEncoderConfig(config?.config)(E.partial(encoders) as any, env, encoders as any)
      ),
   both: (required, optional, config) => (env) =>
      pipe(
         required,
         R.map((f) => f(env)),
         (r) =>
            pipe(
               optional,
               R.map((f) => f(env)),
               (o) =>
                  applyEncoderConfig(config?.config)(E.intersect(E.partial(o))(E.type(r)) as any, env, {
                     required: r as any,
                     optional: o as any
                  })
            )
      )
}));
