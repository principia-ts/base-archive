import * as A from "../../Array/_core";
import * as NA from "../../NonEmptyArray";
import { zipWith_ } from "../_core";
import type { IO } from "../model";

export function reduceAll_<R, E, A>(as: NA.NonEmptyArray<IO<R, E, A>>, f: (b: A, a: A) => A) {
  return A.reduce_(NA.tail(as), NA.head(as), (b, a) => zipWith_(b, a, f));
}

export function reduceAll<A>(
  f: (b: A, a: A) => A
): <R, E>(as: NA.NonEmptyArray<IO<R, E, A>>) => IO<R, E, A> {
  return (as) => reduceAll_(as, f);
}
