import type { Eq } from './Eq'
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from './Function'
import type * as HKT from './HKT'
import type { NonEmptyArrayURI } from './Modules'
import type { ReadonlyRecord } from './Record'
import type * as P from './typeclass'

import * as A from './Array'
import * as O from './Option'
import { getJoinSemigroup, getMeetSemigroup } from './typeclass'

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
export const cons_: <A>(head: A, tail: ReadonlyArray<A>) => NonEmptyArray<A> = A.cons_

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const cons: <A>(tail: ReadonlyArray<A>) => (head: A) => NonEmptyArray<A> = A.cons

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const snoc_: <A>(init: ReadonlyArray<A>, end: A) => NonEmptyArray<A> = A.snoc_

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export const snoc: <A>(end: A) => (init: ReadonlyArray<A>) => NonEmptyArray<A> = A.snoc

/**
 * Builds a `NonEmptyArray` from an array returning `none` if `as` is an empty array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromArray<A>(as: ReadonlyArray<A>): O.Option<NonEmptyArray<A>> {
  return A.isNonEmpty(as) ? O.Some(as) : O.None()
}

/**
 * Builds a `NonEmptyArray` from one or more elements
 *
 * @category Constructors
 * @since 1.0.0
 */
export function make<A>(...as: readonly [A, ...ReadonlyArray<A>]): NonEmptyArray<A> {
  return as
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 */
export function fold<A>(S: P.Semigroup<A>): (as: NonEmptyArray<A>) => A {
  return (as) => A.foldl_(as.slice(1), as[0], S.combine_)
}

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
export function pure<A>(a: A): NonEmptyArray<A> {
  return [a]
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export const zip_: <A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>) => NonEmptyArray<readonly [A, B]> = A.zip_ as any

export const zip: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> = A.zip as any

export const zipWith_: <A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => NonEmptyArray<C> = A.zipWith_ as any

export const zipWith: <A, B, C>(
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => (fa: NonEmptyArray<A>) => NonEmptyArray<C> = A.zipWith as any

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
export const ap: <A>(fa: NonEmptyArray<A>) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = A.ap_ as any

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
export const extend_: <A, B>(
  wa: NonEmptyArray<A>,
  f: (wa: NonEmptyArray<A>) => B
) => NonEmptyArray<B> = A.extend_ as any

/**
 * @category Extend
 * @since 1.0.0
 */
export const extend: <A, B>(
  f: (wa: NonEmptyArray<A>) => B
) => (wa: NonEmptyArray<A>) => NonEmptyArray<B> = A.extend as any

/**
 * @category Extend
 * @since 1.0.0
 */
export const duplicate: <A>(wa: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> = A.duplicate as any

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

/**
 */
export function ifilter_<A, B extends A>(
  fa: NonEmptyArray<A>,
  f: RefinementWithIndex<number, A, B>
): O.Option<NonEmptyArray<B>>
export function ifilter_<A>(fa: NonEmptyArray<A>, f: PredicateWithIndex<number, A>): O.Option<NonEmptyArray<A>>
export function ifilter_<A>(fa: NonEmptyArray<A>, f: PredicateWithIndex<number, A>): O.Option<NonEmptyArray<A>> {
  return fromArray(A.ifilter_(fa, f))
}

/**
 */
export function ifilter<A, B extends A>(
  f: RefinementWithIndex<number, A, B>
): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<B>>
export function ifilter<A>(f: PredicateWithIndex<number, A>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>>
export function ifilter<A>(f: PredicateWithIndex<number, A>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (fa) => ifilter_(fa, f)
}

/**
 */
export function filter_<A, B extends A>(fa: NonEmptyArray<A>, f: Refinement<A, B>): O.Option<NonEmptyArray<B>>
export function filter_<A>(fa: NonEmptyArray<A>, f: Predicate<A>): O.Option<NonEmptyArray<A>>
export function filter_<A>(fa: NonEmptyArray<A>, f: Predicate<A>): O.Option<NonEmptyArray<A>> {
  return ifilter_(fa, (_, a) => f(a))
}

/**
 */
export function filter<A, B extends A>(f: Refinement<A, B>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<B>>
export function filter<A>(f: Predicate<A>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>>
export function filter<A>(f: Predicate<A>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (fa) => ifilter_(fa, (_, a) => f(a))
}

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
  return (fa, f) => A.ifoldl_(fa.slice(1), f(0, fa[0]), (s, i, a) => S.combine_(s, f(i + 1, a)))
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
  return (fa, f) => A.foldl_(fa.slice(1), f(fa[0]), (s, a) => S.combine_(s, f(a)))
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

export function head<A>(as: NonEmptyArray<A>): A {
  return as[0]
}

export function tail<A>(as: NonEmptyArray<A>): ReadonlyArray<A> {
  return as.slice(1)
}

export const reverse: <A>(as: NonEmptyArray<A>) => NonEmptyArray<A> = A.reverse as any

export function min<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => A {
  const S = getMeetSemigroup(O)
  return (as) => as.reduce(S.combine_)
}

export function max<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => A {
  const S = getJoinSemigroup(O)
  return (as) => as.reduce(S.combine_)
}

export function append_<A>(xs: ReadonlyArray<A>, ys: NonEmptyArray<A>): NonEmptyArray<A>
export function append_<A>(xs: NonEmptyArray<A>, ys: ReadonlyArray<A>): NonEmptyArray<A>
export function append_<A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> {
  return A.concat_(xs, ys)
}

export function append<A>(ys: NonEmptyArray<A>): (xs: ReadonlyArray<A>) => NonEmptyArray<A>
export function append<A>(ys: ReadonlyArray<A>): (xs: ReadonlyArray<A>) => NonEmptyArray<A>
export function append<A>(ys: ReadonlyArray<A>): (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (xs) => A.concat_(xs, ys)
}

/**
 * Group equal, consecutive elements of an array into non empty arrays.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function group<A>(
  E: Eq<A>
): {
  (as: NonEmptyArray<A>): NonEmptyArray<NonEmptyArray<A>>
  (as: ReadonlyArray<A>): ReadonlyArray<NonEmptyArray<A>>
}
export function group<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<NonEmptyArray<A>> {
  return (as) => {
    const len = as.length
    if (len === 0) {
      return A.empty()
    }
    const r: Array<NonEmptyArray<A>>  = []
    let head: A                       = as[0]
    let nea: [A, ...ReadonlyArray<A>] = [head]
    for (let i = 1; i < len; i++) {
      const x = as[i]
      if (E.equals_(x, head)) {
        nea.push(x)
      } else {
        r.push(nea)
        head = x
        nea  = [head]
      }
    }
    r.push(nea)
    return r
  }
}

/**
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function groupSort<A>(O: P.Ord<A>): (as: ReadonlyArray<A>) => ReadonlyArray<NonEmptyArray<A>> {
  const sortO  = A.sort(O)
  const groupO = group(O)
  return (as) => groupO(sortO(as))
}

const _hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @category Combinators
 * @since 1.0.0
 */
export function groupBy<A>(f: (a: A) => string): (as: ReadonlyArray<A>) => ReadonlyRecord<string, NonEmptyArray<A>> {
  return (as) => {
    const mut_r: Record<string, [A, ...ReadonlyArray<A>]> = {}
    for (const a of as) {
      const k = f(a)
      if (_hasOwnProperty.call(mut_r, k)) {
        mut_r[k].push(a)
      } else {
        mut_r[k] = [a]
      }
    }
    return mut_r
  }
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
  return as.slice(0, -1)
}

/**
 * @category Combinators
 * @since 1.0.0
 */
export function sort<A>(O: P.Ord<A>): (as: NonEmptyArray<A>) => NonEmptyArray<A> {
  return (as) => A.sort(O)(as) as any
}

export function insertAt_<A>(as: NonEmptyArray<A>, i: number, a: A): O.Option<NonEmptyArray<A>> {
  return A.insertAt_(as, i, a) as any
}

export function insertAt<A>(i: number, a: A): (as: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (as) => insertAt_(as, i, a)
}

export function updateAt_<A>(as: NonEmptyArray<A>, i: number, a: A): O.Option<NonEmptyArray<A>> {
  return A.updateAt_(as, i, a) as any
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
  return A.modifyAt_(as, i, f) as any
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

export { NonEmptyArrayURI } from './Modules'
