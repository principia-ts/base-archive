import "@principia/prelude/Operators";

import * as T from "@principia/core/IO";
import * as S from "@principia/core/Stream";
import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";
import * as v8 from "v8";

import * as stream from "../src/stream";

const readable = () => fs.createReadStream(path.resolve(process.cwd(), "test/file.txt"));

const writable = () => fs.createWriteStream(path.resolve(process.cwd(), "test"));

stream
  .streamFromReadable(readable)
  ["|>"](S.run(stream.sinkFromWritable(writable)))
  ["|>"](T.runMain);
