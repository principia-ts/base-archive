import "@principia/prelude/Operators";

import * as T from "@principia/core/IO";
import * as S from "@principia/core/Stream";
import * as fs from "fs";
import * as path from "path";

import * as stream from "../src/stream";

/*
 * const readLine = PS.stdin["|>"](S.run(Sink.take(1)));
 *
 * const program = T.gen(function* (_) {
 *   const console = yield* _(Con.Console);
 *   yield* _(console.log("Enter some space-separated numbers:"));
 *   const [input] = yield* _(readLine);
 *   yield* _(
 *     E.fold_(
 *       input,
 *       (err) => console.log(err),
 *       (b) =>
 *         b
 *           .toString()
 *           .split(" ")
 *           .reduce((acc, v) => acc + parseFloat(v), 0)
 *           ["|>"](console.log)
 *     )
 *   );
 * });
 */

const readable = () =>
  fs.createReadStream(path.resolve(process.cwd(), "test/file.txt"), {
    highWaterMark: 16
  });

const writable = () => fs.createWriteStream(path.resolve(process.cwd(), "test"));

stream
  .streamFromReadable(readable)
  ["|>"](S.run(stream.sinkFromWritable(writable)))
  ["|>"]((x) => T.run(x, (ex) => console.log(ex)));
