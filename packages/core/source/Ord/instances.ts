import { Monoid } from "../Monoid";
import * as Ordering from "../Ordering";
import { fromCompare } from "./combinators";
import { Ord } from "./Ord";

export const getMonoid = <A = never>(): Monoid<Ord<A>> => ({
   concat: (x) => (y) =>
      fromCompare((a) => (b) => Ordering.Monoid.concat(x.compare(a)(b))(y.compare(a)(b))),
   empty: fromCompare(() => () => Ordering.EQ)
});
