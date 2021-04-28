import * as P from '@principia/prelude'

import { constFalse, constTrue } from './function'

/*
 * -------------------------------------------
 * Contravariant Functor
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: P.Predicate<A>, f: (b: B) => A): P.Predicate<B> {
  return (b) => fa(f(b))
}

export function contramap<A, B>(f: (b: B) => A): (fa: P.Predicate<A>) => P.Predicate<B> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------
 * instances
 * -------------------------------------------
 */

export function getSemigroupAny<A = never>(): P.Semigroup<P.Predicate<A>> {
  return P.Semigroup(or_)
}

export function getMonoidAny<A = never>(): P.Monoid<P.Predicate<A>> {
  return P.Monoid<P.Predicate<A>>(or_, constFalse)
}

export function getSemigroupAll<A = never>(): P.Semigroup<P.Predicate<A>> {
  return P.Semigroup(and_)
}

export function getMonoidAll<A = never>(): P.Monoid<P.Predicate<A>> {
  return P.Monoid<P.Predicate<A>>(and_, constTrue)
}

/*
 * -------------------------------------------
 * utils
 * -------------------------------------------
 */

export function not<A>(predicate: P.Predicate<A>): P.Predicate<A> {
  return (a) => !predicate(a)
}

export function or_<A>(first: P.Predicate<A>, second: P.Predicate<A>): P.Predicate<A> {
  return (a) => first(a) || second(a)
}

export function or<A>(second: P.Predicate<A>): (first: P.Predicate<A>) => P.Predicate<A> {
  return (first) => or_(first, second)
}

export function and_<A>(first: P.Predicate<A>, second: P.Predicate<A>): P.Predicate<A> {
  return (a) => first(a) && second(a)
}

export function and<A>(second: P.Predicate<A>): (first: P.Predicate<A>) => P.Predicate<A> {
  return (first) => and_(first, second)
}
