import type { Stream } from "../model";
import { mapBothPar_ } from "./mapBothPar";

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function mapBoth_<R, E, A, R1, E1, A1, B>(
  me: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): Stream<R & R1, E | E1, B> {
  return mapBothPar_(me, that, f, "seq");
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function bothMap<A, R1, E1, A1, B>(
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): <R, E>(me: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (me) => mapBoth_(me, that, f);
}
