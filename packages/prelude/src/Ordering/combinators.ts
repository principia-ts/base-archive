import { EQ, GT, LT, Ordering } from "./Ordering";

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
