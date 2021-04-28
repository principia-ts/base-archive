import type * as P from '@principia/prelude'

/**
 * Constructs an equivalence between a right-associated nested tuple, and a
 * left-associated nested tuple.
 */
export const tuple = <A, B, C>(): P.Equivalence<readonly [A, readonly [B, C]], readonly [readonly [A, B], C]> => ({
  to: ([a, [b, c]]) => [[a, b], c],
  from: ([[a, b], c]) => [a, [b, c]]
})

export const tupleUnit = <A>(): P.Equivalence<readonly [A, void], A> => ({
  to: ([a, _]) => a,
  from: (a) => [a, undefined]
})

export const tupleFlip = <A, B>(): P.Equivalence<readonly [A, B], readonly [B, A]> => ({
  to: ([a, b]) => [b, a],
  from: ([b, a]) => [a, b]
})

export function compose_<A, B, C>(ab: P.Equivalence<A, B>, bc: P.Equivalence<B, C>): P.Equivalence<A, C> {
  return {
    from: (c) => ab.from(bc.from(c)),
    to: (a) => bc.to(ab.to(a))
  }
}

export function compose<B, C>(bc: P.Equivalence<B, C>): <A>(ab: P.Equivalence<A, B>) => P.Equivalence<A, C> {
  return (ab) => compose_(ab, bc)
}

export * from '@principia/prelude/Equivalence'
