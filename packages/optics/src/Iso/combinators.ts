import type { Iso } from "./model";

/*
 * -------------------------------------------
 * Iso Combinators
 * -------------------------------------------
 */

/**
 * @category Combinators
 * @since 1.0.0
 */
export function reverse<S, A>(sa: Iso<S, A>): Iso<A, S> {
   return {
      get: sa.reverseGet,
      reverseGet: sa.get
   };
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function modify<A>(f: (a: A) => A): <S>(sa: Iso<S, A>) => (s: S) => S {
   return (sa) => (s) => sa.reverseGet(f(sa.get(s)));
}
