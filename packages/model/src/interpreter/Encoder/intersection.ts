import * as A from "@principia/core/Array";
import * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const IntersectionEncoder = implementInterpreter<E.URI, Alg.IntersectionURI>()((_) => ({
  intersection: (types, config) => (env) =>
    pipe(
      types,
      A.map((f) => f(env)),
      (encoders) =>
        applyEncoderConfig(config?.config)(
          A.reduce_(encoders, E.id(), (b, a) => E.intersect(a)(b)) as any,
          env,
          encoders as any
        )
    )
}));
