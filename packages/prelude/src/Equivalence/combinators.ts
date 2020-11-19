import type { Equivalence } from "./model";

export function compose_<A, B, C>(ab: Equivalence<A, B>, bc: Equivalence<B, C>): Equivalence<A, C> {
  return {
    from: (c) => ab.from(bc.from(c)),
    to: (a) => bc.to(ab.to(a))
  };
}

export function compose<B, C>(
  bc: Equivalence<B, C>
): <A>(ab: Equivalence<A, B>) => Equivalence<A, C> {
  return (ab) => compose_(ab, bc);
}
