import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import type { Exit } from "../../Exit";
import * as M from "../../Managed";
import * as T from "../../Task";
import { Stream } from "../model";
import { unfoldChunkM } from "./unfoldChunkM";

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks<R1, E1, B>(
  that: Stream<R1, E1, B>
): <Z>(
  z: Z
) => <R, E, A, C>(
  f: (
    z: Z,
    s: T.Task<R, Option<E>, ReadonlyArray<A>>,
    t: T.Task<R1, Option<E1>, ReadonlyArray<B>>
  ) => T.Task<R & R1, never, Exit<Option<E1 | E>, readonly [ReadonlyArray<C>, Z]>>
) => (stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, C> {
  return (z) => (f) => (stream) =>
    new Stream(
      pipe(
        M.do,
        M.bindS("left", () => stream.proc),
        M.bindS("right", () => that.proc),
        M.bindS(
          "pull",
          ({ left, right }) =>
            unfoldChunkM(z)((z) =>
              pipe(
                f(z, left, right),
                T.chain((ex) => T.optional(T.done(ex)))
              )
            ).proc
        ),
        M.map(({ pull }) => pull)
      )
    );
}
