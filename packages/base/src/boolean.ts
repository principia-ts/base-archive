import type { Predicate } from '@principia/prelude/Predicate'

import * as P from '@principia/prelude'

import * as G from './Guard'

export function invert(b: boolean): boolean {
  return !b
}

export function and_(x: boolean, y: boolean): boolean {
  return x && y
}

export function and(y: boolean): (x: boolean) => boolean {
  return (x) => x && y
}

export function or_(x: boolean, y: boolean): boolean {
  return x || y
}

export function or(y: boolean): (x: boolean) => boolean {
  return (x) => x || y
}

export function xor_(x: boolean, y: boolean): boolean {
  return (x && !y) || (!x && y)
}

export function xor(y: boolean): (x: boolean) => boolean {
  return (x) => (x && !y) || (!x && y)
}

export function allPass_<A>(a: A, ps: ReadonlyArray<Predicate<A>>): boolean {
  return ps.every((f) => f(a))
}

export function allPass<A>(ps: ReadonlyArray<Predicate<A>>): (a: A) => boolean {
  return (a) => ps.every((f) => f(a))
}

export function anyPass_<A>(a: A, ps: ReadonlyArray<Predicate<A>>): boolean {
  return ps.some((f) => f(a))
}

export function anyPass<A>(ps: ReadonlyArray<Predicate<A>>): (a: A) => boolean {
  return (a) => ps.some((f) => f(a))
}

export function andPass_<A>(f: Predicate<A>, g: Predicate<A>): Predicate<A> {
  return (a) => and_(f(a), g(a))
}

export function andPass<A>(g: Predicate<A>): (f: Predicate<A>) => Predicate<A> {
  return (f) => andPass_(f, g)
}

export function orPass_<A>(f: Predicate<A>, g: Predicate<A>): Predicate<A> {
  return (a) => or_(f(a), g(a))
}

export function orPass<A>(g: Predicate<A>): (f: Predicate<A>) => Predicate<A> {
  return (f) => orPass_(f, g)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const SemigroupAll: P.Semigroup<boolean> = P.makeSemigroup((x, y) => x && y)

export const SemigroupAny: P.Semigroup<boolean> = P.makeSemigroup((x, y) => x || y)

export const Eq: P.Eq<boolean> = P.makeEq((x, y) => x === y)

export const Show: P.Show<boolean> = P.makeShow((a) => JSON.stringify(a))

export const Guard: G.Guard<unknown, boolean> = G.makeGuard((u): u is boolean => typeof u === 'boolean')
