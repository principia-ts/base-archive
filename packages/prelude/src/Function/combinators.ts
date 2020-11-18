import type { Predicate, Refinement } from "./model";

/**
 * flip :: (a -> b -> c) -> b -> a -> c
 * Flips the arguments of a curried binary function
 */
export function flip2<A, B, C>(f: (a: A) => (b: B) => C): (b: B) => (a: A) => C {
  return (b) => (a): C => f(a)(b);
}

export function matchPredicate<A, B extends A, C>(
  refinement: Refinement<A, B>,
  onTrue: (a: B) => C,
  onFalse: (a: A) => C
): (a: A) => C;
export function matchPredicate<A, B>(
  predicate: Predicate<A>,
  onTrue: (a: A) => B,
  onFalse: (a: A) => B
): (a: A) => B;
export function matchPredicate<A, B>(
  predicate: Predicate<A>,
  onTrue: (a: A) => B,
  onFalse: (a: A) => B
): (a: A) => B {
  return (a) => (predicate(a) ? onTrue(a) : onFalse(a));
}
