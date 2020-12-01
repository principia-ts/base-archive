/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as A from "../src/Array";
import * as As from "../src/Async";
import * as E from "../src/Either";
import { pipe } from "../src/Function";
import * as T from "../src/IO";
import * as Ref from "../src/IORef";
import * as I from "../src/Iterable";
import * as O from "../src/Option";
import * as S from "../src/Stream";
import * as Sink from "../src/Stream/Sink";
import * as Tr from "../src/Stream/Transducer";
import * as Sy from "../src/Sync";

console.time("A");
const a = A.gen(function* ($) {
  const a = yield* $(() => A.range(0, 10));
  const b = yield* $(() => A.range(1, 10));
  const c = yield* $(() => A.range(2, 10));
  return a * b * c;
});
console.log(a, a.length);
console.timeEnd("A");

console.time("B");
const b = A.chain_(A.range(0, 10), (a) =>
  A.chain_(A.range(1, 10), (b) => A.chain_(A.range(2, 10), (c) => [a * b * c]))
);
console.log(b, b.length);
console.timeEnd("B");
