import type { Lens } from './Lens'
import type { IsoURI } from './Modules'
import type { Optional } from './Optional'
import type { Prism } from './Prism'
import type { Traversal } from './Traversal'
import type { Newtype } from '@principia/base/Newtype'
import type * as P from '@principia/base/typeclass'

import { flow, identity } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import * as O from '@principia/base/Option'

import * as _ from './internal'

/*
 * -------------------------------------------
 * Iso Model
 * -------------------------------------------
 */

export interface Iso<S, A> {
  readonly get: (s: S) => A
  readonly reverseGet: (a: A) => S
}

export type V = HKT.V<'I', '_'>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/*
 * -------------------------------------------
 * Converters
 * -------------------------------------------
 */

/**
 * View an `Iso` as a `Lens`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asLens: <S, A>(sa: Iso<S, A>) => Lens<S, A> = _.isoAsLens

/**
 * View an `Iso` as a `Prism`
 *
 * @category Converters
 * @since 1.0.0
 */
export function asPrism<S, A>(sa: Iso<S, A>): Prism<S, A> {
  return {
    getOption: flow(sa.get, O.some),
    reverseGet: sa.reverseGet
  }
}

/**
 * View an `Iso` as a `Optional`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asOptional: <S, A>(sa: Iso<S, A>) => Optional<S, A> = _.isoAsOptional

/**
 * View an `Iso` as a `Traversal`
 *
 * @category Converters
 * @since 1.0.0
 */
export function asTraversal<S, A>(sa: Iso<S, A>): Traversal<S, A> {
  return {
    modifyF: _.implementModifyF<S, A>()((_) => (F) => (f) => (s) => F.map_(f(sa.get(s)), (a) => sa.reverseGet(a)))
  }
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<I, A, B>(sa: Iso<I, A>, ab: Iso<A, B>): Iso<I, B> {
  return {
    get: flow(sa.get, ab.get),
    reverseGet: flow(ab.reverseGet, sa.reverseGet)
  }
}

/**
 * Compose an `Iso` with an `Iso`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose<A, B>(ab: Iso<A, B>): <I>(sa: Iso<I, A>) => Iso<I, B> {
  return (sa) => compose_(sa, ab)
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S>(): Iso<S, S> {
  return {
    get: identity,
    reverseGet: identity
  }
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: P.Category<[HKT.URI<IsoURI>], V> = HKT.instance({
  id,
  compose,
  compose_
})

/*
 * -------------------------------------------
 * Invariant
 * -------------------------------------------
 */

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap_<I, A, B>(ea: Iso<I, A>, ab: (a: A) => B, ba: (b: B) => A): Iso<I, B> {
  return {
    get: flow(ea.get, ab),
    reverseGet: flow(ba, ea.reverseGet)
  }
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <I>(ea: Iso<I, A>) => Iso<I, B> {
  return (ea) => invmap_(ea, ab, ba)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<[HKT.URI<IsoURI>], V> = HKT.instance({
  invmap_,
  invmap
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * @category Combinators
 * @since 1.0.0
 */
export function reverse<S, A>(sa: Iso<S, A>): Iso<A, S> {
  return {
    get: sa.reverseGet,
    reverseGet: sa.get
  }
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function modify<A>(f: (a: A) => A): <S>(sa: Iso<S, A>) => (s: S) => S {
  return (sa) => (s) => sa.reverseGet(f(sa.get(s)))
}

export function newtype<T extends Newtype<any, any>>(): Iso<T['_A'], T> {
  return {
    get: (_) => _ as any,
    reverseGet: (_) => _ as any
  }
}
