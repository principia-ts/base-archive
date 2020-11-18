import type { Eq } from "./model";

export function fromEquals<A>(equals: (x: A, y: A) => boolean): Eq<A> {
  const equals_ = (x: A, y: A) => x === y || equals(x, y);
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  };
}
