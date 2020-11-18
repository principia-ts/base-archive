import type * as M from "../Monoid";
import { Ordering } from "./Ordering";

export const Monoid: M.Monoid<Ordering> = {
  combine_: (x, y) => (Ordering.unwrap(x) !== "EQ" ? x : y),
  combine: (x) => (y) => (Ordering.unwrap(x) !== "EQ" ? x : y),
  nat: Ordering.wrap("EQ")
};
