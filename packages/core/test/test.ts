import bench from "benchmark";
import { pipeline } from "stream";

import * as Ac from "../source/Async";
import * as E from "../source/Either";
import { pipe } from "../source/Function";
import * as T from "../source/Task/Task";

const suite = new bench.Suite("Async");

suite.add("mine", async function () {
   await pipe(Ac.succeed("A"), (t) => Ac.runPromiseExit(t));
});

suite.add("effect", async function () {
   await pipe(T.succeed("A"), T.runPromiseExit);
});

suite.on("cycle", function (event: any) {
   console.log(String(event.target));
});

suite.run({ async: true });
