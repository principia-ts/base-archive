import * as Eff from "@effect-ts/core/Effect";
import bench from "benchmark";
import { inspect } from "util";

import * as Ac from "../source/Async";
import * as E from "../source/Either";
import { pipe } from "../source/Function";
import * as O from "../source/Option";
import * as T from "../source/Task/Task";

(async () => {
   const start = Date.now();

   const a = await pipe(
      Ac.collectAllPar([
         Ac.async((resolve) => {
            setTimeout(() => {
               resolve(Ac.succeed("A"));
            }, 1000);
         }),
         Ac.async((resolve) => {
            setTimeout(() => {
               resolve(Ac.succeed("A"));
            }, 2000);
         }),
         Ac.succeed("B"),
         Ac.succeed("C")
      ]),
      (t) => Ac.runPromiseExit(t)
   );
   const end = Date.now();

   console.log(a);
   console.log(end - start);
})();

(async () => {
   const start = Date.now();
   const a = await pipe(T.collectAllPar([T.succeed("A"), T.succeed("B"), T.succeed("C")]), T.runPromiseExit);
   const end = Date.now();

   console.log(a);
   console.log(end - start);
})();

(async () => {
   const start = Date.now();
   const a = await pipe(Eff.collectAllPar([Eff.succeed("A"), Eff.succeed("B"), Eff.succeed("C")]), Eff.runPromiseExit);
   const end = Date.now();

   console.log(a);
   console.log(end - start);
})();
