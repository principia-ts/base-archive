import type * as Alg from "../../algebra";

import * as E from "@principia/base/data/Either";
import * as Eq from "@principia/base/data/Eq";
import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import * as R from "@principia/base/data/Record";

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
