import bench from "benchmark";
import { pipeline } from "stream";

import * as Ac from "../source/Async";
import * as T from "../source/Effect/Effect";
import * as E from "../source/Either";
import { pipe } from "../source/Function";

// const cancel = pipe(
//    Ac.async<unknown, never, string>((resolve) => {
//       setTimeout(() => {
//          resolve(Ac.succeed("Hello"));
//       }, 10000);
//    }),
//    Ac.chain((s) => Ac.asksM((_: { name: string }) => Ac.succeed(`${s}, ${_.name}`))),
//    Ac.tap((s) => Ac.total(() => console.log(s))),
//    Ac.giveAll({ name: "Peter" }),
//    (t) => Ac.run(t, (ex) => console.log(ex))
// );

// setTimeout(() => {
//    cancel();
// }, 1000);

const cancel = pipe(
   T.async<unknown, never, string>((resolve) => {
      setTimeout(() => {
         resolve(T.succeed("Hello"));
      }, 10000);
   }),
   T.chain((s) => T.asksM((_: { name: string }) => T.succeed(`${s}, ${_.name}`))),
   T.bracketExit(
      (s) => T.total(() => console.log(s)),
      (_, ex) => T.total(() => console.log(ex))
   ),
   T.giveAll({ name: "Peter" }),
   T.runMain
);

setTimeout(() => {
   cancel();
}, 1000);

// const suite = new bench.Suite("Async");

// suite.add("mine", async function () {
//    await pipe(Ac.succeed("A"), (t) => Ac.runPromiseExit(t));
// });

// suite.add("mikes", async function () {
//    await pipe(As.succeed("A"), (t) => As.runPromiseExit(t));
// });

// suite.add("effect", async function () {
//    await pipe(T.succeed("A"), T.runPromiseExit);
// });

// suite.on("cycle", function (event: any) {
//    console.log(String(event.target));
// });

// suite.run({ async: true });
