import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as I from "../../IO";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import * as BPull from "../BufferedPull";
import { Stream } from "../core";

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumM_<R, E, A, R1, E1, B, Z>(
  stream: Stream<R, E, A>,
  z: Z,
  f: (z: Z, a: A) => I.IO<R1, E1, [Z, B]>
): Stream<R & R1, E | E1, B> {
  return new Stream<R & R1, E | E1, B>(
    pipe(
      M.do,
      M.bindS("state", () => XR.makeManaged(z)),
      M.bindS("pull", () => pipe(stream.proc, M.mapM(BPull.make))),
      M.map(({ pull, state }) =>
        pipe(
          pull,
          BPull.pullElement,
          I.flatMap((o) =>
            pipe(
              I.do,
              I.bindS("s", () => state.get),
              I.bindS("t", ({ s }) => f(s, o)),
              I.tap(({ t }) => state.set(t[0])),
              I.map(({ t }) => [t[1]]),
              I.mapError(O.some)
            )
          )
        )
      )
    )
  );
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumM<Z>(
  z: Z
): <A, R1, E1, B>(
  f: (z: Z, a: A) => I.IO<R1, E1, [Z, B]>
) => <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (f) => (stream) => mapAccumM_(stream, z, f);
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum_<R, E, A, B, Z>(stream: Stream<R, E, A>, z: Z, f: (z: Z, a: A) => [Z, B]) {
  return mapAccumM_(stream, z, (z, a) => I.pure(f(z, a)));
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum<Z>(
  z: Z
): <A, B>(f: (z: Z, a: A) => [Z, B]) => <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (f) => (stream) => mapAccum_(stream, z, f);
}
