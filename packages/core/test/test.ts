import * as As from "@effect-ts/core/Async";
import { inspect } from "util";

import * as Ac from "../source/Async";
import * as E from "../source/Either";
import { pipe } from "../source/Function";
import * as O from "../source/Option";
import * as T from "../source/Task/Task";

(async () => {
   const start = Date.now();

   const [p, i] = pipe(
      Ac.sequenceTPar(
         Ac.unfailable<string>((onInterrupt) => {
            return new Promise((resolve) => {
               const to = setTimeout(() => {
                  resolve("A");
               }, 2000);
               onInterrupt(() => {
                  clearTimeout(to);
               });
            });
         }),
         Ac.succeed("B"),
         Ac.succeed("C")
      ),
      T.tap((a) => T.total(() => console.log(a))),
      T.runPromiseExitCancel
   );
   setTimeout(() => {
      i();
   }, 1000);
   console.log(await p);
   const end = Date.now();

   console.log(end - start);
})();
