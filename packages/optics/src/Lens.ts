import type { Optional } from './Optional'
import type { Prism } from './Prism'
import type { Traversal } from './Traversal'
import type { Predicate, Refinement } from '@principia/base/Function'
import type * as O from '@principia/base/Option'
import type * as P from '@principia/base/typeclass'

import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'

import * as _ from './internal'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Lens<S, A> {
  readonly get: (s: S) => A
  readonly set: (a: A) => (s: S) => S
}

export const URI = 'optics/Lens'

export type URI = typeof URI

export type V = HKT.V<'I', '_'>

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Lens<I, A>
  }
}

/*
 * -------------------------------------------
 * Compositions
 * -------------------------------------------
 */

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composePrism_<S, A, B>(sa: Lens<S, A>, ab: Prism<A, B>): Optional<S, B> {
  return _.lensComposePrism(ab)(sa)
}

/**
 * Compose an `Lens` with a `Prism`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composePrism = _.lensComposePrism

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional_<S, A, B>(sa: Lens<S, A>, ab: Optional<A, B>): Optional<S, B> {
  return _.optionalComposeOptional(ab)(asOptional(sa))
}

/**
 * Compose an `Lens` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional<A, B>(ab: Optional<A, B>): <S>(sa: Lens<S, A>) => Optional<S, B> {
  return (sa) => composeOptional_(sa, ab)
}

/*
 * -------------------------------------------
 * Conversions
 * -------------------------------------------
 */

/**
 * View a `Lens` as an `Optional`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asOptional: <S, A>(sa: Lens<S, A>) => Optional<S, A> = _.lensAsOptional

/**
 * View a `Lens` as a Traversal
 *
 * @category Converters
 * @since 1.0.0
 */
export const asTraversal: <S, A>(sa: Lens<S, A>) => Traversal<S, A> = _.lensAsTraversal

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export const id: <S>() => Lens<S, S> = _.lensId

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<S, A, B>(sa: Lens<S, A>, ab: Lens<A, B>): Lens<S, B> {
  return _.lensComposeLens(ab)(sa)
}

/**
 * Compose an `Lens` with a `Lens`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export const compose = _.lensComposeLens

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: P.Category<[URI], V> = HKT.instance({
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
export function imap_<I, A, B>(ea: Lens<I, A>, ab: (a: A) => B, ba: (b: B) => A): Lens<I, B> {
  return {
    get: flow(ea.get, ab),
    set: flow(ba, ea.set)
  }
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function imap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <I>(ea: Lens<I, A>) => Lens<I, B> {
  return (ea) => imap_(ea, ab, ba)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<[URI], V> = HKT.instance({
  imap_,
  imap
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
export function modify<A>(f: (a: A) => A): <S>(sa: Lens<S, A>) => (s: S) => S {
  return (sa) => (s) => {
    const o = sa.get(s)
    const n = f(o)
    return o === n ? s : sa.set(n)(s)
  }
}

/**
 * Return a `Optional` from a `Lens` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function fromNullable<S, A>(sa: Lens<S, A>): Optional<S, NonNullable<A>> {
  return _.lensComposePrism(_.prismFromNullable<A>())(sa)
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Lens<S, A>) => Optional<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Lens<S, A>) => Optional<S, A>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Lens<S, A>) => Optional<S, A> {
  return composePrism(_.prismFromPredicate(predicate))
}

/**
 * Return a `Lens` from a `Lens` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export const prop: <A, P extends keyof A>(prop: P) => <S>(sa: Lens<S, A>) => Lens<S, A[P]> = _.lensProp

/**
 * Return a `Lens` from a `Lens` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export const props: <A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
) => <S>(sa: Lens<S, A>) => Lens<S, { [K in P]: A[K] }> = _.lensProps

/**
 * Return a `Lens` from a `Lens` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export const component: <A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
) => <S>(sa: Lens<S, A>) => Lens<S, A[P]> = _.lensComponent

/**
 * Return a `Optional` from a `Lens` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function index(i: number) {
  return <S, A>(sa: Lens<S, ReadonlyArray<A>>): Optional<S, A> =>
    pipe(sa, asOptional, _.optionalComposeOptional(_.indexArray<A>().index(i)))
}

/**
 * Return a `Optional` from a `Lens` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function key(key: string) {
  return <S, A>(sa: Lens<S, Readonly<Record<string, A>>>): Optional<S, A> =>
    pipe(sa, asOptional, _.optionalComposeOptional(_.indexRecord<A>().index(key)))
}

/**
 * Return a `Lens` from a `Lens` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 */
export function atKey(key: string) {
  return <S, A>(sa: Lens<S, Readonly<Record<string, A>>>): Lens<S, O.Option<A>> =>
    pipe(sa, compose(_.atRecord<A>().at(key)))
}

/**
 * Return a `Optional` from a `Lens` focused on the `Some` of a `Option` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Lens<S, O.Option<A>>) => Optional<S, A> = composePrism(_.prismSome())

/**
 * Return a `Optional` from a `Lens` focused on the `Right` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const right: <S, E, A>(sea: Lens<S, E.Either<E, A>>) => Optional<S, A> = composePrism(_.prismRight())

/**
 * Return a `Optional` from a `Lens` focused on the `Left` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const left: <S, E, A>(sea: Lens<S, E.Either<E, A>>) => Optional<S, E> = composePrism(_.prismLeft())

/**
 * Return a `Traversal` from a `Lens` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function traverse<T extends HKT.URIS, C = HKT.Auto>(
  T: P.Traversable<T, C>
): <S, N extends string, K, Q, W, X, I, S_, R, E, A>(
  sta: Lens<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, E, A>>
) => Traversal<S, A> {
  return flow(asTraversal, _.traversalComposeTraversal(_.fromTraversable(T)()))
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export const findl: <A>(predicate: Predicate<A>) => <S>(sa: Lens<S, ReadonlyArray<A>>) => Optional<S, A> = flow(
  _.findFirst,
  composeOptional
)
