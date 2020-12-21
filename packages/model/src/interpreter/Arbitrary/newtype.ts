import type * as Alg from "../../algebra";
import type { ArbURI } from "./HKT";
import type { Some } from "@principia/base/data/Option";

import { pipe } from "@principia/base/data/Function";

import { implementInterpreter } from "../../HKT";
import { applyArbitraryConfig } from "./HKT";

export const NewtypeArbitrary = implementInterpreter<ArbURI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(arb.map(iso.get), env, arb)),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (arb) =>
      applyArbitraryConfig(config?.config)(
        arb
          .filter((a) => prism.getOption(a)._tag === "Some")
          .map((a) => (prism.getOption(a) as Some<any>).value),
        env,
        arb
      )
    )
}));
