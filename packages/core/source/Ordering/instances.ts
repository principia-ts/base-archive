import type * as TC from "../typeclass-index";
import { Ordering } from "./Ordering";

export const Monoid: TC.Monoid<Ordering> = {
   concat: (x) => (y) => (Ordering.unwrap(x) !== "EQ" ? x : y),
   empty: Ordering.wrap("EQ")
};
