/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as A from "../src/Array";
import * as E from "../src/Either";
import * as T from "../src/IO";
import * as I from "../src/Iterable";
import * as S from "../src/Stream";
import * as Sink from "../src/Stream/Sink";
import * as Tr from "../src/Stream/Transducer";
import * as Sy from "../src/Sync";
import {USync} from "../src/Sync";

const factorial = (n: bigint): USync<bigint> => Sy.gen(function* ($) {
   if(n === 0n) return 1n;
   else return n * (yield* $(factorial(n - 1n)))
});

console.log(Sy.runIO(factorial(1000n)));
