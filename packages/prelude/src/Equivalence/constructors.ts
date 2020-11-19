import type { Equivalence } from "./model";

/**
 * Constructs an equivalence between a right-associated nested tuple, and a
 * left-associated nested tuple.
 */
export const tuple = <A, B, C>(): Equivalence<
  readonly [A, readonly [B, C]],
  readonly [readonly [A, B], C]
> => ({
  to: ([a, [b, c]]) => [[a, b], c],
  from: ([[a, b], c]) => [a, [b, c]]
});

export const tupleUnit = <A>(): Equivalence<readonly [A, void], A> => ({
  to: ([a, _]) => a,
  from: (a) => [a, undefined]
});

export const tupleFlip = <A, B>(): Equivalence<readonly [A, B], readonly [B, A]> => ({
  to: ([a, b]) => [b, a],
  from: ([b, a]) => [a, b]
});
