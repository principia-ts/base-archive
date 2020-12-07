import "@principia/prelude/Operators";

import * as T from "@principia/core/IO";
import * as F from "@principia/core/IO/Fiber";
import * as M from "@principia/core/Managed";
import * as S from "@principia/core/Stream";
import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";
import * as zlib from "zlib";

import * as FS from "../src/fs";
import * as NS from "../src/stream";
import * as Z from "../src/zlib";

const readable = () => fs.createReadStream(path.resolve(process.cwd(), "test/file.txt"), {});

const writable = () => fs.createWriteStream(path.resolve(process.cwd(), "test/file.txt.gz"), {});

NS.streamFromReadable(() => fs.createReadStream(path.resolve(process.cwd(), "test/file.txt")))
  ["|>"](Z.gzip())
  ["|>"](S.ensuring(T.total(() => console.log("ensuring triggered"))))
  ["|>"](S.runCollect)
  ["|>"](T.runMain);
