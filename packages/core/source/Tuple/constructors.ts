import type { Tuple } from "./model";

export const tuple_ = <A, E>(a: A, e: E): Tuple<A, E> => [a, e] as const;

export const tuple = <E>(e: E) => <A>(a: A): Tuple<A, E> => [a, e] as const;
