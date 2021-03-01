export interface Eq<A> {
  readonly equals_: (x: A, y: A) => boolean
  readonly equals: (y: A) => (x: A) => boolean
}

export function makeEq<A>(equals: (x: A, y: A) => boolean): Eq<A> {
  const equals_ = (x: A, y: A) => x === y || equals(x, y)
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
}
