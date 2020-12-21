import type { Exit } from "../../Exit";
import type { Option } from "@principia/base/data/Option";

import { flow } from "@principia/base/data/Function";

import * as I from "../../IO";
import * as M from "../../Managed";
import * as BPull from "../BufferedPull";
import { Stream } from "../core";
import { unfoldM } from "./unfoldM";

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `combineChunks` for a more efficient implementation.
 */
export function combine_<R, E, O, R1, E1, O1, Z, C>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, O>,
    t: I.IO<R1, Option<E1>, O1>
  ) => I.IO<R & R1, never, Exit<Option<E | E1>, readonly [C, Z]>>
): Stream<R & R1, E | E1, C> {
  return new Stream(
    M.gen(function* (_) {
      const left = yield* _(M.mapM_(stream.proc, BPull.make));
      const right = yield* _(M.mapM_(that.proc, BPull.make));
      const pull = yield* _(
        unfoldM(z, (z) =>
          I.flatMap_(
            f(z, BPull.pullElement(left), BPull.pullElement(right)),
            flow(I.done, I.optional)
          )
        ).proc
      );
      return pull;
    })
  );
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `combineChunks` for a more efficient implementation.
 */
export function combine<R, E, O, R1, E1, O1, Z, C>(
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, O>,
    t: I.IO<R1, Option<E1>, O1>
  ) => I.IO<R & R1, never, Exit<Option<E | E1>, readonly [C, Z]>>
): (stream: Stream<R, E, O>) => Stream<R & R1, E | E1, C> {
  return (stream) => combine_(stream, that, z, f);
}
