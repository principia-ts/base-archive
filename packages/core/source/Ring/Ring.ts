import type { Semiring } from "../Semiring";

export interface Ring<A> extends Semiring<A> {
   readonly sub: (x: A) => (y: A) => A;
}
