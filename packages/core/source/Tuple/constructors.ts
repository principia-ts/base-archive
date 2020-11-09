import type { Tuple } from "./model";

export const tuple_ = <A, I>(a: A, i: I): Tuple<A, I> => [a, i];

export const tuple = <I>(i: I) => <A>(a: A): Tuple<A, I> => [a, i];
