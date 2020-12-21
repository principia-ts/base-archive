import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as C from "../../Chunk";
import * as I from "../../IO";
import * as Ref from "../../IORef";
import * as M from "../../Managed";
import { Stream } from "../core";

/**
 * Drops the specified number of elements from this stream.
 */
export function drop_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("chunks", () => self.proc),
      M.bindS("counterRef", () => I.toManaged_(Ref.make(0))),
      M.letS("pull", ({ chunks, counterRef }) => {
        const go: I.IO<R, O.Option<E>, C.Chunk<O>> = I.flatMap_(chunks, (chunk) =>
          I.flatMap_(counterRef.get, (count) => {
            if (count >= n) {
              return I.succeed(chunk);
            } else if (chunk.length <= n - count) {
              return I.andThen_(counterRef.set(count + chunk.length), go);
            } else {
              return I.as_(counterRef.set(count + (n - count)), () => C.drop_(chunk, n - count));
            }
          })
        );

        return go;
      }),
      M.map(({ pull }) => pull)
    )
  );
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop(n: number) {
  return <R, E, O>(self: Stream<R, E, O>) => drop_(self, n);
}
