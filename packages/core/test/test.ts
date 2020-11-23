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

const ws = () => fs.createWriteStream(path.resolve(process.cwd(), "test/file"));

const rs = S.readFile(path.resolve(process.cwd(), "package.json"), { highWaterMark: 8 });

(async () => {
  const p = S.run_(rs, Sink.fromWritable(ws))["|>"](T.runPromiseExit);
  console.log(await p);
})();
