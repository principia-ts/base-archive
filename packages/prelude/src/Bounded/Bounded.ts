import type { Ord } from "../Ord";
import { ordNumber } from "../Ord";

export interface Bounded<A> extends Ord<A> {
  readonly top: A;
  readonly bottom: A;
}

export const boundedNumber: Bounded<number> = {
  ...ordNumber,
  top: Infinity,
  bottom: -Infinity
};
