import { pipe } from "../../Function";
import * as I from "../../IO";
import type { Exit } from "../../IO/Exit";
import * as M from "../../Managed";
import type { Option } from "../../Option";
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
    s: I.IO<R, Option<E>, ReadonlyArray<A>>,
    t: I.IO<R1, Option<E1>, ReadonlyArray<B>>
  ) => I.IO<R & R1, never, Exit<Option<E1 | E>, readonly [ReadonlyArray<C>, Z]>>
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
                I.chain((ex) => I.optional(I.done(ex)))
              )
            ).proc
        ),
        M.map(({ pull }) => pull)
      )
    );
}
