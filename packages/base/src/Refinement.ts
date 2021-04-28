import type * as P from '@principia/prelude'

import * as O from './Option'

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function fromOptionK<A, B extends A>(pf: (a: A) => O.Option<B>): P.Refinement<A, B> {
  return (a): a is B => O.isSome(pf(a))
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<A, B extends A, C extends B>(
  ab: P.Refinement<A, B>,
  bc: P.Refinement<B, C>
): P.Refinement<A, C> {
  return (i): i is C => ab(i) && bc(i)
}

export function compose<A, B extends A, C extends B>(
  bc: P.Refinement<B, C>
): (ab: P.Refinement<A, B>) => P.Refinement<A, C> {
  return (ab) => compose_(ab, bc)
}

export function id<A>(): P.Refinement<A, A> {
  return (_): _ is A => true
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function not<A, B extends A>(refinement: P.Refinement<A, B>): P.Refinement<A, Exclude<A, B>> {
  return (a): a is Exclude<A, B> => !refinement(a)
}

export function or_<A, B extends A, C extends A>(
  first: P.Refinement<A, B>,
  second: P.Refinement<A, C>
): P.Refinement<A, B | C> {
  return (a): a is B | C => first(a) || second(a)
}

export function or<A, C extends A>(
  second: P.Refinement<A, C>
): <B extends A>(first: P.Refinement<A, B>) => P.Refinement<A, B | C> {
  return (first) => or_(first, second)
}

export function and_<A, B extends A, C extends A>(
  first: P.Refinement<A, B>,
  second: P.Refinement<A, C>
): P.Refinement<A, B & C> {
  return (a): a is B & C => first(a) && second(a)
}

export function and<A, C extends A>(
  second: P.Refinement<A, C>
): <B extends A>(first: P.Refinement<A, B>) => P.Refinement<A, B & C> {
  return (first) => and_(first, second)
}

export function zero<A, B extends A>(): P.Refinement<A, B> {
  return (_): _ is B => false
}
