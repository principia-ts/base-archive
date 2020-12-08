import { boolean, number, string } from "../Eq";
import { EQ, GT, LT, Ordering } from "../Ordering";
import type { Ord } from "./Ord";

export const fromCompare = <A>(cmp: (x: A, y: A) => Ordering): Ord<A> => {
  return {
    compare_: cmp,
    compare: (y) => (x) => cmp(x, y),
    equals_: (x, y) => Ordering.unwrap(cmp(x, y)) === "EQ",
    equals: (y) => (x) => Ordering.unwrap(cmp(x, y)) === "EQ"
  };
};

const defaultCompare = (y: any): ((x: any) => Ordering) => {
  return (x) => (x < y ? LT : x > y ? GT : EQ);
};

const defaultCompare_ = (x: any, y: any) => (x < y ? LT : x > y ? GT : EQ);

export const ordString: Ord<string> = {
  ...string,
  compare: defaultCompare,
  compare_: defaultCompare_
};

export const ordNumber: Ord<number> = {
  ...number,
  compare: defaultCompare,
  compare_: defaultCompare_
};

export const ordBoolean: Ord<boolean> = {
  ...boolean,
  compare: defaultCompare,
  compare_: defaultCompare_
};

export const lt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) === LT;

export const gt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) === GT;

export const leq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) !== GT;

export const geq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare_(x, y) !== LT;

export const min = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare_(x, y) === GT ? y : x);

export const max = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare_(x, y) === LT ? y : x);

export const lt_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) === LT;

export const gt_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) === GT;

export const leq_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) !== GT;

export const geq_ = <A>(O: Ord<A>) => (x: A, y: A): boolean => O.compare_(x, y) !== LT;

export const min_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === GT ? y : x);

export const max_ = <A>(O: Ord<A>) => (x: A, y: A): A => (O.compare_(x, y) === LT ? y : x);
