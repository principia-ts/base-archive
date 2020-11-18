import * as E from "@principia/core/Either";
import * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";
import * as R from "@principia/core/Record";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEqConfig } from "./HKT";

export const SumEq = implementInterpreter<Eq.URI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((t) => t(env)),
      (eqs) => applyEqConfig(config?.config)(Eq.sum_(tag, eqs), env, eqs as any)
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyEqConfig(config?.config)(E.getEq(l, r), env, { left: l, right: r })
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (eq) => applyEqConfig(config?.config)(O.getEq(eq), env, eq))
}));
