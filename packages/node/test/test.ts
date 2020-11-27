import { Integer } from "@principia/core/Integer";
import * as T from "@principia/core/Task";
import * as S from "@principia/core/Task/Stream";
import * as Sink from "@principia/core/Task/Stream/Sink";
import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as FS from "../src/fs";

(() => {
  console.time("a");
  FS.createReadStream(path.resolve(process.cwd(), "packages/node/test/test.txt"))
    ["|>"](
      S.run(FS.createWriteSink(path.resolve(process.cwd(), "packages/node/test/test_sink.txt")))
    )
    ["|>"]((x) =>
      T.run(x, (ex) => {
        console.log(inspect(ex));
        console.timeEnd("a");
      })
    );
})();

(() => {
  console.time("b");
  const s = fs.createReadStream(path.resolve(process.cwd(), "packages/node/test/test.txt"));
  const w = fs.createWriteStream(
    path.resolve(process.cwd(), "packages/node/test/test_writestream.txt")
  );
  s.on("data", (chunk: Buffer) => w.write(chunk));
  s.on("error", (err) => {
    console.log(err);
    w.destroy(err);
    s.destroy();
  });
  w.on("error", (err) => {
    console.log(err);
    s.destroy(err);
    w.destroy();
  });
  s.on("close", () => {
    w.close();
    console.timeEnd("b");
  });
})();
