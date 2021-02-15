import type { Lens } from './Lens'
import type { PrismURI } from './Modules'
import type { Optional } from './Optional'
import type { Traversal } from './Traversal'
import type { Predicate, Refinement } from '@principia/base/Function'
import type { Option } from '@principia/base/Option'
import type * as P from '@principia/base/typeclass'

import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import * as O from '@principia/base/Option'

import * as _ from './internal'

export interface Prism<S, A> {
  readonly getOption: (s: S) => Option<A>
  readonly reverseGet: (a: A) => S
}

export type _S<X> = X extends Prism<infer S, any> ? S : never
export type _A<X> = X extends Prism<any, infer A> ? A : never

export type V = HKT.V<'I', '_'>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate: {
  <S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>
  <A>(predicate: Predicate<A>): Prism<A, A>
} = _.prismFromPredicate

/*
 * -------------------------------------------
 * Compositions
 * -------------------------------------------
 */

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeLens_<S, A, B>(sa: Prism<S, A>, ab: Lens<A, B>): Optional<S, B> {
  return _.prismComposeLens(ab)(sa)
}

/**
 * Compose a `Prism` with a `Lens`
 *
 * @category Compositions
 * @since 1.0.0
 */
export const composeLens = _.prismComposeLens

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional_<S, A, B>(sa: Prism<S, A>, ab: Optional<A, B>): Optional<S, B> {
  return _.optionalComposeOptional(ab)(asOptional(sa))
}

/**
 * Compose a `Prism` with an `Optional`
 *
 * @category Compositions
 * @since 1.0.0
 */
export function composeOptional<A, B>(ab: Optional<A, B>): <S>(sa: Prism<S, A>) => Optional<S, B> {
  return (sa) => composeOptional_(sa, ab)
}

/*
 * -------------------------------------------
 * Convereters
 * -------------------------------------------
 */

/**
 * View a `Prism` as an `Optional`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asOptional = _.prismAsOptional

/**
 * View a `Prism` as a `Traversal`
 *
 * @category Converters
 * @since 1.0.0
 */
export const asTraversal = _.prismAsTraversal

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S>(): Prism<S, S> {
  return {
    getOption: O.some,
    reverseGet: identity
  }
}

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose_<S, A, B>(sa: Prism<S, A>, ab: Prism<A, B>): Prism<S, B> {
  return {
    getOption: flow(sa.getOption, O.bind(ab.getOption)),
    reverseGet: flow(ab.reverseGet, sa.reverseGet)
  }
}

/**
 * Compose a `Prism` with a `Prism`
 *
 * @category Semigroupoid
 * @since 1.0.0
 */
export function compose<A, B>(ab: Prism<A, B>): <S>(sa: Prism<S, A>) => Prism<S, B> {
  return (sa) => compose_(sa, ab)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Category: P.Category<[HKT.URI<PrismURI>], V> = HKT.instance({
  compose,
  compose_,
  id
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
export function invmap_<S, A, B>(ea: Prism<S, A>, ab: (a: A) => B, ba: (b: B) => A): Prism<S, B> {
  return {
    getOption: flow(ea.getOption, O.map(ab)),
    reverseGet: flow(ba, ea.reverseGet)
  }
}

/**
 * @category Invariant
 * @since 1.0.0
 */
export function invmap<A, B>(ab: (a: A) => B, ba: (b: B) => A): <S>(ea: Prism<S, A>) => Prism<S, B> {
  return (ea) => invmap_(ea, ab, ba)
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Invariant: P.Invariant<[HKT.URI<PrismURI>], V> = HKT.instance({
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
export const set: <A>(a: A) => <S>(sa: Prism<S, A>) => (s: S) => S = _.prismSet

/**
 * @category Combinators
 * @since 1.0.0
 */
export const modifyOption: <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (s: S) => Option<S> = _.prismModifyOption

/**
 * @category Combinators
 * @since 1.0.0
 */
export const modify: <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (s: S) => S = _.prismModify

/**
 * Return a `Prism` from a `Prism` focused on a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export const fromNullable: <S, A>(sa: Prism<S, A>) => Prism<S, NonNullable<A>> = compose(_.prismFromNullable())

/**
 * @category Combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(refinement: Refinement<A, B>): <S>(sa: Prism<S, A>) => Prism<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A> {
  return compose(_.prismFromPredicate(predicate))
}

/**
 * Return a `Optional` from a `Prism` and a prop
 *
 * @category Combinators
 * @since 1.0.0
 */
export function prop<A, P extends keyof A>(prop: P): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
  return composeLens(pipe(_.lensId<A>(), _.lensProp(prop)))
}

/**
 * Return a `Optional` from a `Prism` and a list of props
 *
 * @category Combinators
 * @since 1.0.0
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <S>(
  sa: Prism<S, A>
) => Optional<
  S,
  {
    [K in P]: A[K]
  }
> {
  return composeLens(pipe(_.lensId<A>(), _.lensProps(...props)))
}

/**
 * Return a `Optional` from a `Prism` and a component
 *
 * @category Combinators
 * @since 1.0.0
 */
export function component<A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): <S>(sa: Prism<S, A>) => Optional<S, A[P]> {
  return composeLens(pipe(_.lensId<A>(), _.lensComponent(prop)))
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyArray`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function index(i: number) {
  return <S, A>(sa: Prism<S, ReadonlyArray<A>>): Optional<S, A> =>
    pipe(sa, asOptional, _.optionalComposeOptional(_.indexArray<A>().index(i)))
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function key(key: string) {
  return <S, A>(sa: Prism<S, Readonly<Record<string, A>>>): Optional<S, A> =>
    pipe(sa, asOptional, _.optionalComposeOptional(_.indexRecord<A>().index(key)))
}

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a required key
 *
 * @category Combinators
 * @since 1.0.0
 */
export function atKey(key: string) {
  return <S, A>(sa: Prism<S, Readonly<Record<string, A>>>): Optional<S, Option<A>> =>
    _.prismComposeLens(_.atRecord<A>().at(key))(sa)
}

/**
 * Return a `Prism` from a `Prism` focused on the `Some` of a `Option` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <S, A>(soa: Prism<S, Option<A>>) => Prism<S, A> = compose(_.prismSome())

/**
 * Return a `Prism` from a `Prism` focused on the `Right` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const right: <S, E, A>(sea: Prism<S, E.Either<E, A>>) => Prism<S, A> = compose(_.prismRight())

/**
 * Return a `Prism` from a `Prism` focused on the `Left` of a `Either` type
 *
 * @category Combinators
 * @since 1.0.0
 */
export const left: <S, E, A>(sea: Prism<S, E.Either<E, A>>) => Prism<S, E> = compose(_.prismLeft())

/**
 * Return a `Traversal` from a `Prism` focused on a `Traversable`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function traverse<T extends HKT.URIS, C = HKT.Auto>(
  T: P.Traversable<T, C>
): <S, N extends string, K, Q, W, X, I, S_, R, E, A>(
  sta: Prism<S, HKT.Kind<T, C, N, K, Q, W, X, I, S_, R, E, A>>
) => Traversal<S, A> {
  return flow(asTraversal, _.traversalComposeTraversal(_.fromTraversable(T)()))
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export const findl: <A>(predicate: Predicate<A>) => <S>(sa: Prism<S, ReadonlyArray<A>>) => Optional<S, A> = flow(
  _.findFirst,
  composeOptional
)
