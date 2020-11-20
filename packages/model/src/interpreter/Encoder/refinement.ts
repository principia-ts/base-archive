import type * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const RefinementEncoder = implementInterpreter<E.URI, Alg.RefinementURI>()((_) => ({
  refine_: (a, refinement, name, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(encoder, env, encoder)),
  constrain: (a, predicate, name, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(encoder, env, encoder))
}));
