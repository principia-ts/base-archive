import { pipe } from "@principia/core/Function";
import * as G from "@principia/core/Guard";
import * as R from "@principia/core/Record";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyGuardConfig } from "./HKT";

export const ObjectGuard = implementInterpreter<G.URI, Alg.ObjectURI>()((_) => ({
   type: (properties, config) => (env) =>
      pipe(
         properties,
         R.map((f) => f(env)),
         (guards) => applyGuardConfig(config?.config)(G.type(guards) as any, env, guards as any)
      ),
   partial: (properties, config) => (env) =>
      pipe(
         properties,
         R.map((f) => f(env)),
         (guards) => applyGuardConfig(config?.config)(G.partial(guards) as any, env, guards as any)
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
                  applyGuardConfig(config?.config)(G.intersect(G.type(r))(G.partial(o)) as any, env, {
                     required: r as any,
                     optional: o as any
                  })
            )
      )
}));
