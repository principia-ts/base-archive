import type { Stream } from "../model";
import { mapBothPar_ } from "./mapBothPar";

export const mapBoth_ = <R, E, A, R1, E1, A1, B>(
   stream: Stream<R, E, A>,
   that: Stream<R1, E1, A1>,
   f: (a: A, a1: A1) => B
) => mapBothPar_(stream, that, f, "seq");

export const bothMap = <A, R1, E1, A1, B>(that: Stream<R1, E1, A1>, f: (a: A, a1: A1) => B) => <R, E>(
   stream: Stream<R, E, A>
) => mapBoth_(stream, that, f);
