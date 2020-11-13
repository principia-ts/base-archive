import type { Tuple } from "./model";

export function tuple_<A, I>(a: A, i: I): Tuple<A, I> {
   return [a, i];
}

export function tuple<I>(i: I): <A>(a: A) => Tuple<A, I> {
   return (a) => [a, i];
}
