import { pipe } from "../../../Function";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as BPull from "../internal/BufferedPull";
import { Stream } from "../model";
/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumM_<R, E, A, R1, E1, B, Z>(
  stream: Stream<R, E, A>,
  z: Z,
  f: (z: Z, a: A) => T.Task<R1, E1, [Z, B]>
): Stream<R & R1, E | E1, B> {
  return new Stream<R & R1, E | E1, B>(
    pipe(
      M.do,
      M.bindS("state", () => XR.makeManagedRef(z)),
      M.bindS("pull", () => pipe(stream.proc, M.mapM(BPull.make))),
      M.map(({ pull, state }) =>
        pipe(
          pull,
          BPull.pullElement,
          T.chain((o) =>
            pipe(
              T.do,
              T.bindS("s", () => state.get),
              T.bindS("t", ({ s }) => f(s, o)),
              T.tap(({ t }) => state.set(t[0])),
              T.map(({ t }) => [t[1]]),
              T.mapError(O.some)
            )
          )
        )
      )
    )
  );
}

export function mapAccumM<Z>(
  z: Z
): <A, R1, E1, B>(
  f: (z: Z, a: A) => T.Task<R1, E1, [Z, B]>
) => <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (f) => (stream) => mapAccumM_(stream, z, f);
}

export function mapAccum_<R, E, A, B, Z>(stream: Stream<R, E, A>, z: Z, f: (z: Z, a: A) => [Z, B]) {
  return mapAccumM_(stream, z, (z, a) => T.pure(f(z, a)));
}

export function mapAccum<Z>(
  z: Z
): <A, B>(f: (z: Z, a: A) => [Z, B]) => <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (f) => (stream) => mapAccum_(stream, z, f);
}
