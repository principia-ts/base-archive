import "@principia/base/unsafe/Operators";

import { pipe } from "@principia/base/data/Function";
import * as I from "@principia/io/IO";

import { nodeRuntime } from "../src/Runtime";

pipe(
  I.succeed(1),
  I.flatMap((n) => I.succeed(n + 1)),
  I.flatMap((n) => I.succeed(n + 2)),
  I.flatMap((n) => I.fail(new Error(`${n}`))),
  nodeRuntime.runMain
);
