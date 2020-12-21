import type * as Alg from "../../algebra";
import type * as E from "@principia/decoders/Encoder";

import { pipe } from "@principia/base/data/Function";

import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const RefinementEncoder = implementInterpreter<E.URI, Alg.RefinementURI>()((_) => ({
  refine_: (a, refinement, name, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(encoder, env, encoder)),
  constrain: (a, predicate, name, config) => (env) =>
    pipe(a(env), (encoder) => applyEncoderConfig(config?.config)(encoder, env, encoder))
}));
