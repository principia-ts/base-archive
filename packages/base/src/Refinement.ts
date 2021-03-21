/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Refinement<A, B extends A> {
  (a: A): a is B
}

export interface RefinementWithIndex<I, A, B extends A> {
  (i: I, a: A): a is B
}

/*
 * -------------------------------------------
 * Utils
 * -------------------------------------------
 */

export function not<A, B extends A>(refinement: Refinement<A, B>): Refinement<A, Exclude<A, B>> {
  return (a): a is Exclude<A, B> => !refinement(a)
}

export function or_<A, B extends A, C extends A>(
  first: Refinement<A, B>,
  second: Refinement<A, C>
): Refinement<A, B | C> {
  return (a): a is B | C => first(a) || second(a)
}

export function or<A, C extends A>(
  second: Refinement<A, C>
): <B extends A>(first: Refinement<A, B>) => Refinement<A, B | C> {
  return (first) => or_(first, second)
}

export function and_<A, B extends A, C extends A>(
  first: Refinement<A, B>,
  second: Refinement<A, C>
): Refinement<A, B & C> {
  return (a): a is B & C => first(a) && second(a)
}

export function and<A, C extends A>(
  second: Refinement<A, C>
): <B extends A>(first: Refinement<A, B>) => Refinement<A, B & C> {
  return (first) => and_(first, second)
}
