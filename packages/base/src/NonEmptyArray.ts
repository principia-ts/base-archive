import type { Either } from './Either'
import type { Guard } from './Guard'
import type { NonEmptyArrayURI } from './Modules'
import type { ReadonlyRecord } from './Record'
import type * as HKT from '@principia/prelude/HKT'

import * as P from '@principia/prelude'

import * as A from './Array/core'
import * as G from './Guard'
import * as _ from './internal/array'
import * as O from './Option'
import * as S from './Semigroup'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type NonEmptyArray<A> = ReadonlyArray<A> & {
  readonly 0: A
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const prepend_: <A>(tail: ReadonlyArray<A>, head: A) => NonEmptyArray<A> = A.prepend_

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const prepend: <A>(head: A) => (tail: ReadonlyArray<A>) => NonEmptyArray<A> = A.prepend

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const append_: <A>(init: ReadonlyArray<A>, end: A) => NonEmptyArray<A> = A.append_

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const append: <A>(end: A) => (init: ReadonlyArray<A>) => NonEmptyArray<A> = A.append

/**
 * Builds a `NonEmptyArray` from an array returning `none` if `as` is an empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromArray<A>(as: ReadonlyArray<A>): O.Option<NonEmptyArray<A>> {
  return _.isNonEmpty(as) ? O.Some(as) : O.None()
}

/**
 * Return a `NonEmptyArray` of length `n` with element `i` initialized with `f(i)`.
 *
 * @category Constructors
 * @since 1.0.0
 */

export const makeBy: <A>(n: number, f: (i: number) => A) => NonEmptyArray<A> = _.makeBy

/**
 * Builds a `NonEmptyArray` from one or more elements
 *
 * @category Constructors
 * @since 1.0.0
 */
export function make<A>(...as: readonly [A, ...ReadonlyArray<A>]): NonEmptyArray<A> {
  return as
}

export function range(start: number, end: number): NonEmptyArray<number> {
  return start <= end ? makeBy(end - start + 1, (i) => start + i) : [start]
}

export function replicate<A>(n: number, a: A): NonEmptyArray<A> {
  return makeBy(n, () => a)
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export function fold<A>(S: P.Semigroup<A>): (as: NonEmptyArray<A>) => A {
  return (as) => A.foldl_(as.slice(1), as[0], S.combine_)
}

export function unprepend<A>(as: NonEmptyArray<A>): readonly [A, ReadonlyArray<A>] {
  return [head(as), tail(as)]
}

export function unappend<A>(as: NonEmptyArray<A>): readonly [ReadonlyArray<A>, A] {
  return [init(as), last(as)]
}

export function matchLeft_<A, B>(as: NonEmptyArray<A>, f: (head: A, tail: ReadonlyArray<A>) => B): B {
  return f(head(as), tail(as))
}

export function matchLeft<A, B>(f: (head: A, tail: ReadonlyArray<A>) => B): (as: NonEmptyArray<A>) => B {
  return (as) => matchLeft_(as, f)
}

export function matchRight_<A, B>(as: NonEmptyArray<A>, f: (init: ReadonlyArray<A>, last: A) => B): B {
  return f(init(as), last(as))
}

export function matchRight<A, B>(f: (init: ReadonlyArray<A>, last: A) => B): (as: NonEmptyArray<A>) => B {
  return (as) => matchRight_(as, f)
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export const isNonEmpty: <A>(as: ReadonlyArray<A>) => as is NonEmptyArray<A> = _.isNonEmpty

export const isOutOfBound_: <A>(as: NonEmptyArray<A>, i: number) => boolean = A.isOutOfBound_

export const isOutOfBound: (i: number) => <A>(as: NonEmptyArray<A>) => boolean = A.isOutOfBound

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt_: <A>(fa: NonEmptyArray<A>, that: () => NonEmptyArray<A>) => NonEmptyArray<A> = A.alt_ as any

/**
 *
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt: <A>(that: () => NonEmptyArray<A>) => (fa: NonEmptyArray<A>) => NonEmptyArray<A> = A.alt as any

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * Lifts a value into a `NonEmptyArray`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure = A.pure

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function zip_<A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>): NonEmptyArray<readonly [A, B]> {
  return zipWith_(fa, fb, P.tuple)
}

export function zip<B>(fb: NonEmptyArray<B>): <A>(fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function zipWith_<A, B, C>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>, f: (a: A, b: B) => C): NonEmptyArray<C> {
  const mut_cs = [f(fa[0], fb[0])] as P.Mutable<NonEmptyArray<C>>
  const len    = Math.min(fa.length, fb.length)
  for (let i = 1; i < len; i++) {
    mut_cs[i] = f(fa[i], fb[i])
  }
  return mut_cs
}

export function zipWith<A, B, C>(
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
): (fa: NonEmptyArray<A>) => NonEmptyArray<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export const cross_: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<readonly [A, B]> = A.cross_ as any

export const cross: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> = A.cross as any

export const crossWith_: <A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => NonEmptyArray<C> = A.crossWith_ as any

export const crossWith: <A, B, C>(
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => (fa: NonEmptyArray<A>) => NonEmptyArray<C> = A.crossWith as any

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap_: <A, B>(fab: NonEmptyArray<(a: A) => B>, fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.ap_ as any

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap: <A>(fa: NonEmptyArray<A>) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = A.ap as any

/*
 * -------------------------------------------
 * Comonad
 * -------------------------------------------
 */

/**
 * @category Comonad
 * @since 1.0.0
 */
export const extract: <A>(ma: NonEmptyArray<A>) => A = head

/*
 * -------------------------------------------
 * Extend
 * -------------------------------------------
 */

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend_<A, B>(wa: NonEmptyArray<A>, f: (wa: NonEmptyArray<A>) => B): NonEmptyArray<B> {
  let next  = tail(wa)
  const out = [f(wa)] as P.Mutable<NonEmptyArray<B>>
  while (isNonEmpty(next)) {
    out.push(f(next))
    next = tail(next)
  }
  return out
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function extend<A, B>(f: (wa: NonEmptyArray<A>) => B): (wa: NonEmptyArray<A>) => NonEmptyArray<B> {
  return (wa) => extend_(wa, f)
}

/**
 * @category Extend
 * @since 1.0.0
 */
export function duplicate<A>(wa: NonEmptyArray<A>): NonEmptyArray<NonEmptyArray<A>> {
  return extend_(wa, P.identity)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export const ifilter_: {
  <A, B extends A>(fa: NonEmptyArray<A>, f: P.RefinementWithIndex<number, A, B>): ReadonlyArray<B>
  <A>(fa: NonEmptyArray<A>, f: P.PredicateWithIndex<number, A>): ReadonlyArray<A>
} = A.ifilter_

export const ifilter: {
  <A, B extends A>(f: P.RefinementWithIndex<number, A, B>): (fa: NonEmptyArray<A>) => ReadonlyArray<B>
  <A>(f: P.PredicateWithIndex<number, A>): (fa: NonEmptyArray<A>) => ReadonlyArray<A>
} = A.ifilter

export const filter_: {
  <A, B extends A>(fa: NonEmptyArray<A>, f: P.Refinement<A, B>): ReadonlyArray<B>
  <A>(fa: NonEmptyArray<A>, f: P.Predicate<A>): ReadonlyArray<A>
} = A.filter_

export const filter: {
  <A, B extends A>(f: P.Refinement<A, B>): (fa: NonEmptyArray<A>) => ReadonlyArray<B>
  <A>(f: P.Predicate<A>): (fa: NonEmptyArray<A>) => ReadonlyArray<A>
} = A.filter

export const ifilterMap_: <A, B>(fa: NonEmptyArray<A>, f: (i: number, a: A) => O.Option<B>) => ReadonlyArray<B> =
  A.ifilterMap_

export const ifilterMap: <A, B>(f: (i: number, a: A) => O.Option<B>) => (fa: NonEmptyArray<A>) => ReadonlyArray<B> =
  A.ifilterMap

export const filterMap_: <A, B>(fa: NonEmptyArray<A>, f: (a: A) => O.Option<B>) => ReadonlyArray<B> = A.filterMap_

export const filterMap: <A, B>(f: (a: A) => O.Option<B>) => (fa: NonEmptyArray<A>) => ReadonlyArray<B> = A.filterMap

export const ipartition_: {
  <A, B extends A>(fa: NonEmptyArray<A>, refinement: P.RefinementWithIndex<number, A, B>): readonly [
    ReadonlyArray<A>,
    ReadonlyArray<B>
  ]
  <A>(fa: NonEmptyArray<A>, predicate: P.PredicateWithIndex<number, A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
} = A.ipartition_

export const ipartition: {
  <A, B extends A>(refinement: P.RefinementWithIndex<number, A, B>): (
    fa: NonEmptyArray<A>
  ) => readonly [ReadonlyArray<A>, ReadonlyArray<B>]
  <A>(predicate: P.PredicateWithIndex<number, A>): (
    fa: NonEmptyArray<A>
  ) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
} = A.ipartition

export const partition_: {
  <A, B extends A>(fa: NonEmptyArray<A>, refinement: P.Refinement<A, B>): readonly [ReadonlyArray<A>, ReadonlyArray<B>]
  <A>(fa: NonEmptyArray<A>, predicate: P.Predicate<A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
} = A.partition_

export const partition: {
  <A, B extends A>(refinement: P.Refinement<A, B>): (
    fa: NonEmptyArray<A>
  ) => readonly [ReadonlyArray<A>, ReadonlyArray<B>]
  <A>(predicate: P.Predicate<A>): (fa: NonEmptyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
} = A.partition

export const ipartitionMap_: <A, B, C>(
  fa: NonEmptyArray<A>,
  f: (i: number, a: A) => Either<B, C>
) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] = A.ipartitionMap_

export const ipartitionMap: <A, B, C>(
  f: (i: number, a: A) => Either<B, C>
) => (fa: NonEmptyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] = A.ipartitionMap

export const partitionMap_: <A, B, C>(
  fa: NonEmptyArray<A>,
  f: (a: A) => Either<B, C>
) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] = A.partitionMap_

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: NonEmptyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] = A.partitionMap

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const ifoldl_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, i: number, a: A) => B) => B = A.ifoldl_

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const ifoldl: <A, B>(b: B, f: (b: B, i: number, a: A) => B) => (fa: NonEmptyArray<A>) => B = A.ifoldl

/**
 * @category Foldable
 * @since 1.0.0
 */
export const foldl_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, a: A) => B) => B = A.foldl_

/**
 * @category Foldable
 * @since 1.0.0
 */
export const foldl: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: NonEmptyArray<A>) => B = A.foldl

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const ifoldr_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, i: number, b: B) => B) => B = A.ifoldr_

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const ifoldr: <A, B>(b: B, f: (a: A, i: number, b: B) => B) => (fa: NonEmptyArray<A>) => B = A.ifoldr

/**
 * @category Foldable
 * @since 1.0.0
 */
export const foldr_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, b: B) => B) => B = A.foldr_

/**
 * @category Foldable
 * @since 1.0.0
 */
export const foldr: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: NonEmptyArray<A>) => B = A.foldr

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (i: number, a: A) => S) => S {
  return (fa, f) => A.ifoldl_(tail(fa), f(0, head(fa)), (s, i, a) => S.combine_(s, f(i + 1, a)))
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap<S>(S: P.Semigroup<S>): <A>(f: (i: number, a: A) => S) => (fa: NonEmptyArray<A>) => S {
  return (f) => (fa) => ifoldMap_(S)(fa, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (a: A) => S) => S {
  return (fa, f) => ifoldMap_(S)(fa, (_, a) => f(a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap<S>(S: P.Semigroup<S>): <A>(f: (a: A) => S) => (fa: NonEmptyArray<A>) => S {
  return (f) => (fa) => foldMap_(S)(fa, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export const imap_: <A, B>(fa: NonEmptyArray<A>, f: (i: number, a: A) => B) => NonEmptyArray<B> = A.imap_ as any

export const imap: <A, B>(f: (i: number, a: A) => B) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.imap as any

export const map_: <A, B>(fa: NonEmptyArray<A>, f: (a: A) => B) => NonEmptyArray<B> = A.map_ as any

export const map: <A, B>(f: (a: A) => B) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.map as any

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

/**
 * Removes one level of nesting from a nested `NonEmptyArray`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: <A>(mma: NonEmptyArray<NonEmptyArray<A>>) => NonEmptyArray<A> = A.flatten as any

export const ibind_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (i: number, a: A) => NonEmptyArray<B>
) => NonEmptyArray<B> = A.ibind_ as any

export const ibind: <A, B>(
  f: (i: number, a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.ibind as any

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind_: <A, B>(ma: NonEmptyArray<A>, f: (a: A) => NonEmptyArray<B>) => NonEmptyArray<B> = A.bind_ as any

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind: <A, B>(f: (a: A) => NonEmptyArray<B>) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.bind as any

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

/**
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const itraverse_: P.TraverseWithIndexFn_<[HKT.URI<NonEmptyArrayURI>]> = A.itraverse_ as any

/**
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const itraverse: P.TraverseWithIndexFn<[HKT.URI<NonEmptyArrayURI>]> = A.itraverse as any

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[HKT.URI<NonEmptyArrayURI>]> = A.traverse_ as any

/**
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[HKT.URI<NonEmptyArrayURI>]> = A.traverse as any

/**
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[HKT.URI<NonEmptyArrayURI>]> = A.sequence as any

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

/**
 * @category Unit
 * @since 1.0.0
 */
export function unit(): NonEmptyArray<void> {
  return [undefined]
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * @category combinators
 * @since 1.0.0
 */
export const uniq: <A>(E: P.Eq<A>) => (as: NonEmptyArray<A>) => NonEmptyArray<A> = A.uniq as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const reverse: <A>(as: NonEmptyArray<A>) => NonEmptyArray<A> = A.reverse as any

/**
 * @category combinators
 * @since 1.0.0
 */
export function concat_<A>(xs: ReadonlyArray<A>, ys: NonEmptyArray<A>): NonEmptyArray<A>
export function concat_<A>(xs: NonEmptyArray<A>, ys: ReadonlyArray<A>): NonEmptyArray<A>
export function concat_<A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> {
  return A.concat_(xs, ys)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function concat<A>(ys: NonEmptyArray<A>): (xs: ReadonlyArray<A>) => NonEmptyArray<A>
export function concat<A>(
  ys: ReadonlyArray<A>
): {
  (xs: NonEmptyArray<A>): NonEmptyArray<A>
  (xs: ReadonlyArray<A>): ReadonlyArray<A>
}
export function concat<A>(ys: ReadonlyArray<A>): (xs: NonEmptyArray<A>) => ReadonlyArray<A> {
  return (xs) => A.concat_(xs, ys)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const chunksOf_: <A>(as: NonEmptyArray<A>, n: number) => NonEmptyArray<NonEmptyArray<A>> = A.chunksOf_ as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const chunksOf: (n: number) => <A>(as: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> = A.chunksOf as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const chop_: <A, B>(
  as: NonEmptyArray<A>,
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
) => NonEmptyArray<B> = A.chop_ as any

/**
 * @category combinators
 * @since 1.0.0
 */
export const chop: <A, B>(
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
) => (as: NonEmptyArray<A>) => NonEmptyArray<B> = A.chop as any

/**
 * Group equal, consecutive elements of an array into non empty arrays.
 *
 * @category combinators
 * @since 1.0.0
 */
export const group: <A>(E: P.Eq<A>) => (as: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> = A.group as any

/**
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @category combinators
 * @since 1.0.0
 */
export function groupSort<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> {
  const sortO  = sort(O)
  const groupO = group(O)
  return (as) => groupO(sortO(as))
}

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @category combinators
 * @since 1.0.0
 */
export const groupBy_: <A>(as: ReadonlyArray<A>, f: (a: A) => string) => ReadonlyRecord<string, NonEmptyArray<A>> =
  A.groupBy_

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @category combinators
 * @since 1.0.0
 */
export const groupBy: <A>(f: (a: A) => string) => (as: ReadonlyArray<A>) => ReadonlyRecord<string, NonEmptyArray<A>> =
  A.groupBy

/**
 * @category combinators
 * @since 1.0.0
 */
export function sort<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => (as.length === 1 ? as : (as.slice().sort((first, second) => O.compare_(first, second)) as any))
}

export function insertAt_<A>(as: NonEmptyArray<A>, i: number, a: A): O.Option<NonEmptyArray<A>> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(unsafeInsertAt_(as, i, a))
}

export function insertAt<A>(i: number, a: A): (as: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (as) => insertAt_(as, i, a)
}

export function updateAt_<A>(as: NonEmptyArray<A>, i: number, a: A): O.Option<NonEmptyArray<A>> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(unsafeUpdateAt_(as, i, a))
}

export function updateAt<A>(i: number, a: A): (as: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (as) => updateAt_(as, i, a)
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export function modifyAt_<A>(as: NonEmptyArray<A>, i: number, f: (a: A) => A): O.Option<NonEmptyArray<A>> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(unsafeModifyAt_(as, i, f))
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export function modifyAt<A>(i: number, f: (a: A) => A): (as: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (as) => modifyAt_(as, i, f)
}

/**
 * @since 1.0.0
 */
export const unzip: <A, B>(
  as: NonEmptyArray<readonly [A, B]>
) => readonly [NonEmptyArray<A>, NonEmptyArray<B>] = A.unzip as any

/*
 * -------------------------------------------
 * Unsafe
 * -------------------------------------------
 */

export const unsafeModifyAt_: <A>(
  as: NonEmptyArray<A>,
  i: number,
  f: (a: A) => A
) => NonEmptyArray<A> = A.unsafeModifyAt_ as any

export const unsafeModifyAt: <A>(
  i: number,
  f: (a: A) => A
) => (as: NonEmptyArray<A>) => NonEmptyArray<A> = A.unsafeModifyAt as any

export const unsafeUpdateAt_: <A>(as: NonEmptyArray<A>, i: number, a: A) => NonEmptyArray<A> = A.unsafeUpdateAt_ as any

export const unsafeUpdateAt: <A>(
  i: number,
  a: A
) => (as: NonEmptyArray<A>) => NonEmptyArray<A> = A.unsafeUpdateAt as any

export const unsafeInsertAt_: <A>(as: NonEmptyArray<A>, i: number, a: A) => NonEmptyArray<A> = A.unsafeInsertAt_

export const unsafeInsertAt: <A>(i: number, a: A) => (as: NonEmptyArray<A>) => NonEmptyArray<A> = A.unsafeInsertAt

/*
 * -------------------------------------------
 * Utilities
 * -------------------------------------------
 */

/**
 * Clones a `NonEmptyArray` returning the clone typed as mutable
 *
 * @since 1.0.0
 */
export const mutableClone: <A>(as: NonEmptyArray<A>) => P.Mutable<NonEmptyArray<A>> = A.mutableClone as any

/**
 * Clones a `NonEmptyArray` returning the clone typed as immutable
 *
 * @since 1.0.0
 */
export const clone: <A>(as: NonEmptyArray<A>) => NonEmptyArray<A> = A.mutableClone as any

/**
 * Get the first element of a `NonEmptyArray`
 *
 * @since 1.0.0
 */
export function head<A>(as: NonEmptyArray<A>): A {
  return as[0]
}

/**
 * @since 1.0.0
 */
export function tail<A>(as: NonEmptyArray<A>): ReadonlyArray<A> {
  const out = Array(as.length - 1)
  for (let i = 1; i < as.length; i++) {
    out.push(as[i])
  }
  return out
}

/**
 * Get the last elements of a non empty array
 *
 * @since 1.0.0
 */
export function last<A>(as: NonEmptyArray<A>): A {
  return as[as.length - 1]
}

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @since 1.0.0
 */
export function init<A>(as: NonEmptyArray<A>): ReadonlyArray<A> {
  const out = Array(as.length - 1)
  for (let i = 0; i < as.length - 1; i++) {
    out.push(as[i])
  }
  return out
}

/**
 * Transiently mutate the `NonEmptyArray`. Copies the input array, then exececutes `f` on it
 *
 * @since 1.0.0
 */
export function mutate_<A>(as: NonEmptyArray<A>, f: (as: P.Mutable<NonEmptyArray<A>>) => void): ReadonlyArray<A> {
  const mut_as = mutableClone(as)
  f(mut_as)
  return mut_as
}

/**
 * Transiently mutate the `NonEmptyArray`. Copies the input array, then exececutes `f` on it
 *
 * @since 1.0.0
 */
export function mutate<A>(f: (as: P.Mutable<NonEmptyArray<A>>) => void): (as: NonEmptyArray<A>) => ReadonlyArray<A> {
  return (as) => mutate_(as, f)
}

/**
 * @since 1.0.0
 */
export function min<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => A {
  const Sa = S.min(O)
  return (as) => {
    const [head, tail] = unprepend(as)
    return isNonEmpty(tail) ? foldl_(tail, head, Sa.combine_) : head
  }
}

/**
 * @since 1.0.0
 */
export function max<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => A {
  const Sa = S.max(O)
  return (as) => {
    const [head, tail] = unprepend(as)
    return isNonEmpty(tail) ? foldl_(tail, head, Sa.combine_) : head
  }
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const GuardUnknownNonEmptyArray: Guard<unknown, NonEmptyArray<unknown>> = P.pipe(
  A.GuardUnknownArray,
  G.refine((i): i is NonEmptyArray<unknown> => i.length > 0)
)

export { NonEmptyArrayURI } from './Modules'
