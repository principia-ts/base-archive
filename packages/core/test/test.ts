/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as A from "../src/Array";
import * as E from "../src/Either";
import * as I from "../src/Iterable";
import * as T from "../src/Task";
import * as S from "../src/Task/Stream";
import * as Sink from "../src/Task/Stream/Sink";
import * as Tr from "../src/Task/Stream/Transducer";

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 7, 3, 5, 2];

console.log(A.dropLastWhile_(arr, (n) => n < 10));
