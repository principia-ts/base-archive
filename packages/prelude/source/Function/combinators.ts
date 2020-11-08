import type { Predicate, Refinement } from "./model";

/**
 * flip :: (a -> b -> c) -> b -> a -> c
 * Flips the arguments of a curried binary function
 */
export const flip2 = <A, B, C>(f: (a: A) => (b: B) => C) => (b: B) => (a: A): C => f(a)(b);

export const matchPredicate: {
   <A, B extends A, C>(refinement: Refinement<A, B>, onTrue: (a: B) => C, onFalse: (a: A) => C): (a: A) => C;
   <A, B>(predicate: Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => B): (a: A) => B;
} = <A, B>(predicate: Predicate<A>, onTrue: (a: A) => B, onFalse: (a: A) => B) => (a: A) =>
   predicate(a) ? onTrue(a) : onFalse(a);
