import * as As from "@effect-ts/core/Async";
import { inspect } from "util";

import * as A from "../source/Array";
import * as Ac from "../source/Async";
import * as E from "../source/Either";
import { pipe } from "../source/Function";
import * as O from "../source/Option";
import * as Sy from "../source/Sync";
import * as T from "../source/Task/Task";
import * as X from "../source/XPure";

(() => {
   const start = Date.now();

   const a = pipe(
      Sy.gen(function* (_) {
         const a = yield* _(Sy.succeed("Hello"));
         const b = yield* _(Sy.asks((_: { name: string }) => _.name));
         return `${a}, ${b}!`;
      }),
      Sy.tap((s) => Sy.total(() => console.log(s))),
      Sy.giveAll({ name: "Peter" }),
      X.runIO
   );

   const end = Date.now();
   console.log(end - start);
})();

(() => {
   const start = Date.now();

   const a = pipe(
      Sy.do,
      Sy.bindS("a", () => Sy.succeed("Hello")),
      Sy.bindS("b", () => Sy.asks((_: { name: string }) => _.name)),
      Sy.letS("res", ({ a, b }) => `${a}, ${b}!`),
      Sy.tap((s) => Sy.total(() => console.log(s.res))),
      Sy.giveAll({ name: "Peter" }),
      X.runIO
   );

   const end = Date.now();
   console.log(end - start);
})();

(() => {
   const start = Date.now();

   const a = (n: number) =>
      E.gen(function* (_) {
         const a = yield* _(
            E.partial_(
               () => {
                  if (n !== 42) {
                     throw "An Error";
                  }
                  return n;
               },
               (_) => _ as string
            )
         );
         const b = yield* _(Sy.total(() => a + 1));
         return a + b;
      });

   console.log(a(42));

   const end = Date.now();
   console.log(end - start);
})();

const a = A.gen(function* (_) {
   const b = yield* _([1, 2, 3]);
   const c = yield* _([4, 5, 6]);
   return b + c;
});

console.log(a);

const b = pipe(
   A.do,
   A.bindS("a", () => [1, 2, 3]),
   A.bindS("b", () => [4, 5, 6]),
   A.letS("res", ({ a, b }) => a + b),
   A.map(({ res }) => res)
);

console.log(b);
