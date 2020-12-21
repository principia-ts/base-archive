import type { Chunk } from "../../Chunk";
import type { Exit } from "../../Exit";
import type { Option } from "@principia/base/data/Option";

import { pipe } from "@principia/base/data/Function";

import * as I from "../../IO";
import * as M from "../../Managed";
import { Stream } from "../core";
import { unfoldChunkM } from "./unfoldChunkM";

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks_<R, E, O, R1, E1, O1, Z, C>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, Chunk<O>>,
    t: I.IO<R1, Option<E1>, Chunk<O1>>
  ) => I.IO<R & R1, never, Exit<Option<E | E1>, readonly [Chunk<C>, Z]>>
): Stream<R & R1, E | E1, C> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("left", () => stream.proc),
      M.bindS("right", () => that.proc),
      M.bindS(
        "pull",
        ({ left, right }) =>
          unfoldChunkM(z, (z) =>
            pipe(
              f(z, left, right),
              I.flatMap((ex) => I.optional(I.done(ex)))
            )
          ).proc
      ),
      M.map(({ pull }) => pull)
    )
  );
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks<R, E, O, R1, E1, O1, Z, C>(
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, Chunk<O>>,
    t: I.IO<R1, Option<E1>, Chunk<O1>>
  ) => I.IO<R & R1, never, Exit<Option<E | E1>, readonly [Chunk<C>, Z]>>
): (stream: Stream<R, E, O>) => Stream<R & R1, E | E1, C> {
  return (stream) => combineChunks_(stream, that, z, f);
}
