import { fromCombine } from "../Semigroup";
import type { Monoid } from "./Monoid";

export const makeMonoid = <A>(c: (l: A, r: A) => A, nat: A): Monoid<A> => ({
  ...fromCombine(c),
  nat
});
