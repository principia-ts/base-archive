import type { Ordering } from "../Ordering";

export interface CompareFn<A> {
   (y: A): (x: A) => Ordering;
}

export interface CompareFn_<A> {
   (x: A, y: A): Ordering;
}
