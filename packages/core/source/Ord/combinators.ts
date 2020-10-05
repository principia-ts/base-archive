import { eqBoolean, eqNumber, eqString } from "../Eq";
import { EQ, GT, LT, Ordering } from "../Ordering";
import type { Ord } from "./Ord";

export const fromCompare = <A>(compare: (x: A) => (y: A) => Ordering): Ord<A> => ({
   compare,
   equals: (y) => (x) => compare(y)(x) === EQ
});

const __compare = (y: any) => (x: any): Ordering => (x < y ? LT : x > y ? GT : EQ);

export const ordString: Ord<string> = {
   ...eqString,
   compare: __compare
};

export const ordNumber: Ord<number> = {
   ...eqNumber,
   compare: __compare
};

export const ordBoolean: Ord<boolean> = {
   ...eqBoolean,
   compare: __compare
};

export const lt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare(x)(y) === LT;

export const gt = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare(x)(y) === GT;

export const leq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare(x)(y) !== GT;

export const geq = <A>(O: Ord<A>) => (y: A) => (x: A): boolean => O.compare(x)(y) !== LT;

export const min = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare(x)(y) === GT ? y : x);

export const max = <A>(O: Ord<A>) => (y: A) => (x: A): A => (O.compare(x)(y) === LT ? y : x);
