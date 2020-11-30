import * as fs from "fs";

import { pipe } from "../Function";
import * as I from "../IO";
import * as M from "../Managed";
import * as O from "../Option";
import * as Q from "../Queue";
import { Stream } from "./model";

export function readFile(
  path: fs.PathLike,
  options?: Parameters<typeof fs.createReadStream>[1]
): Stream<unknown, Error, Buffer> {
  return new Stream(
    M.gen(function* (_) {
      const ns = yield* _(
        pipe(
          I.total(() => fs.createReadStream(path, options)),
          M.makeExit((rs) =>
            I.total(() => {
              rs.close();
            })
          )
        )
      );

      const queue = yield* _(
        M.makeExit_(Q.makeUnbounded<I.FIO<O.Option<Error>, [Buffer]>>(), (q) => q.shutdown)
      );

      yield* _(
        pipe(
          I.total(() => {
            ns.on("data", (chunk: Buffer) => {
              I.run(queue.offer(I.succeed([chunk])));
            });
            ns.on("end", () => {
              I.run(queue.offer(I.fail(O.none())));
            });
            ns.on("error", (err) => {
              I.run(queue.offer(I.fail(O.some(err))));
            });
          }),
          M.makeExit(() =>
            I.total(() => {
              ns.removeAllListeners();
            })
          )
        )
      );

      return I.flatten(queue.take);
    })
  );
}
