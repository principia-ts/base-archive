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
export const reverse = <S, A>(sa: Iso<S, A>): Iso<A, S> => ({
   get: sa.reverseGet,
   reverseGet: sa.get
});

/**
 * @category Combinators
 * @since 1.0.0
 */
export const modify = <A>(f: (a: A) => A) => <S>(sa: Iso<S, A>) => (s: S): S => sa.reverseGet(f(sa.get(s)));
