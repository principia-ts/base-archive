import type * as Alg from "../../algebra";

import * as Eq from "@principia/base/data/Eq";
import { pipe } from "@principia/base/data/Function";

import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const PrimitivesEq = implementInterpreter<Eq.URI, Alg.PrimitivesURI>()((_) => ({
  string: (config) => (env) => applyEqConfig(config?.config)(Eq.string, env, {}),
  number: (config) => (env) => applyEqConfig(config?.config)(Eq.number, env, {}),
  boolean: (config) => (env) => applyEqConfig(config?.config)(Eq.boolean, env, {}),
  literal: (..._) => (config) => (env) => applyEqConfig(config?.config)(Eq.strict, env, {}),
  stringLiteral: (_, config) => (env) => applyEqConfig(config?.config)(Eq.string, env, {}),
  numberLiteral: (_, config) => (env) => applyEqConfig(config?.config)(Eq.number, env, {}),
  bigint: (config) => (env) => applyEqConfig(config?.config)(Eq.strict, env, {}),
  date: (config) => (env) =>
    applyEqConfig(config?.config)(
      pipe(
        Eq.number,
        Eq.contramap((d) => d.getTime())
      ),
      env,
      {}
    ),
  array: (item, config) => (env) =>
    pipe(item(env), (eq) => applyEqConfig(config?.config)(Eq.array(eq), env, eq)),
  nonEmptyArray: (item, config) => (env) =>
    pipe(item(env), (eq) => applyEqConfig(config?.config)(Eq.array(eq), env, eq)),
  keyof: (_, config) => (env) => applyEqConfig(config?.config)(Eq.strict, env, {}),
  UUID: (config) => (env) => applyEqConfig(config?.config)(Eq.string, env, {})
}));
