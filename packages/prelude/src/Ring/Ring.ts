import type { Semiring } from "../Semiring";

export interface Ring<A> extends Semiring<A> {
  readonly sub_: (x: A, y: A) => A;
  readonly sub: (y: A) => (x: A) => A;
}
