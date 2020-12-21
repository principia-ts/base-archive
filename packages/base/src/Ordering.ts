import type { Monoid } from "./Monoid";
import type { TypeOf } from "./Newtype";

import { newtype, typeDef } from "./Newtype";

const Ordering_ = typeDef<"LT" | "EQ" | "GT">()("Ordering");

export interface Ordering extends TypeOf<typeof Ordering_> {}
export const Ordering = newtype<Ordering>()(Ordering_);

export const LT = Ordering.wrap("LT");
export const GT = Ordering.wrap("GT");
export const EQ = Ordering.wrap("EQ");

export const sign = (n: number): Ordering => (n <= -1 ? LT : n >= 1 ? GT : EQ);

export const invert = (O: Ordering): Ordering => {
  switch (Ordering.unwrap(O)) {
    case "LT":
      return GT;
    case "GT":
      return LT;
    case "EQ":
      return EQ;
  }
};

export const toNumber = (O: Ordering) => {
  switch (Ordering.unwrap(O)) {
    case "LT":
      return -1;
    case "GT":
      return 1;
    case "EQ":
      return 0;
  }
};

export const MonoidOrdering: Monoid<Ordering> = {
  combine_: (x, y) => (Ordering.unwrap(x) !== "EQ" ? x : y),
  combine: (x) => (y) => (Ordering.unwrap(x) !== "EQ" ? x : y),
  nat: Ordering.wrap("EQ")
};
