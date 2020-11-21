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

const rs = fs.createReadStream(path.resolve(process.cwd(), "package.json"));

const s = S.readFile(path.resolve(process.cwd(), "package.json"), { highWaterMark: 8 });

s["|>"](S.runCollect)
  ["|>"](T.chain((buffers) => T.total(() => console.log(buffers.map((b) => b.toString("utf-8"))))))
  ["|>"](T.run);
