import type { Stream } from "../model";
import { mapBothPar_ } from "./mapBothPar";

export function mapBoth_<R, E, A, R1, E1, A1, B>(
  stream: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): Stream<R & R1, E | E1, B> {
  return mapBothPar_(stream, that, f, "seq");
}

export function bothMap<A, R1, E1, A1, B>(
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (stream) => mapBoth_(stream, that, f);
}
