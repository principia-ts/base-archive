import type { Ordering } from "../Ordering";

export interface CompareF<A> {
   (x: A): (y: A) => Ordering;
}
