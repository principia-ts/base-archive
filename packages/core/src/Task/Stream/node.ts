import * as fs from "fs";

import { pipe } from "../../Function";
import * as O from "../../Option";
import * as M from "../Managed";
import * as T from "../Task";
import * as Q from "../XQueue";
import { Stream } from "./model";

export function readFile(
  path: fs.PathLike,
  options?: Parameters<typeof fs.createReadStream>[1]
): Stream<unknown, Error, Buffer> {
  return new Stream(
    M.gen(function* (_) {
      const ns = yield* _(
        pipe(
          T.total(() => fs.createReadStream(path, options)),
          M.makeExit((rs) =>
            T.total(() => {
              rs.close();
            })
          )
        )
      );

      const queue = yield* _(
        M.makeExit_(Q.makeUnbounded<T.EIO<O.Option<Error>, [Buffer]>>(), (q) => q.shutdown)
      );

      yield* _(
        pipe(
          T.total(() => {
            ns.on("data", (chunk: Buffer) => {
              T.run(queue.offer(T.succeed([chunk])));
            });
            ns.on("end", () => {
              T.run(queue.offer(T.fail(O.none())));
            });
            ns.on("error", (err) => {
              T.run(queue.offer(T.fail(O.some(err))));
            });
          }),
          M.makeExit(() =>
            T.total(() => {
              ns.removeAllListeners();
            })
          )
        )
      );

      return T.flatten(queue.take);
    })
  );
}
