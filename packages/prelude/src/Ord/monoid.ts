import type { Monoid } from "../Monoid";
import * as Ordering from "../Ordering";
import type { CombineFn_ } from "../Semigroup";
import { fromCompare } from "./combinators";
import type { Ord } from "./Ord";

export const getMonoid = <A = never>(): Monoid<Ord<A>> => {
  const combine_: CombineFn_<Ord<A>> = (x, y) =>
    fromCompare((a, b) => Ordering.Monoid.combine_(x.compare(a)(b), y.compare(a)(b)));
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y),
    nat: fromCompare(() => Ordering.EQ)
  };
};
