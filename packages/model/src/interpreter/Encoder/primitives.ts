import * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const PrimitivesEncoder = implementInterpreter<E.URI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  number: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  boolean: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  literal: (..._) => (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  stringLiteral: (value, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  numberLiteral: (value, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  bigint: (config) => (env) =>
    applyEncoderConfig(config?.config)({ encode: (i) => i.toString() }, env, {}),
  date: (config) => (env) =>
    applyEncoderConfig(config?.config)({ encode: (d) => d.toISOString() }, env, {}),
  array: (item, config) => (env) =>
    pipe(item(env), (encoder) =>
      applyEncoderConfig(config?.config)(E.array(encoder), env, encoder)
    ),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (encoder) =>
      applyEncoderConfig(config?.config)(E.array(encoder), env, encoder)
    ),
  keyof: (keys, config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {}),
  UUID: (config) => (env) => applyEncoderConfig(config?.config)(E.id(), env, {})
}));
