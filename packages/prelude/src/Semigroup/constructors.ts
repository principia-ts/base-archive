import type { Semigroup } from "./Semigroup";

export const fromCombine = <A>(c: (x: A, y: A) => A): Semigroup<A> => ({
   combine_: c,
   combine: (y) => (x) => c(x, y)
});
