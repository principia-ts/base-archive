import type * as HKT from '../HKT'
import type * as P from '../typeclass'
import type { Eq } from './Eq'
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from './Function'
import type { ReadonlyRecord } from './Record'

import { getJoinSemigroup, getMeetSemigroup } from '../typeclass'
import * as A from './Array'
import * as O from './Option'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type NonEmptyArray<A> = ReadonlyArray<A> & {
  readonly 0: A
}

export const NonEmptyArrayURI = 'NonEmptyArray'

export type NonEmptyArrayURI = typeof NonEmptyArrayURI

export type V = HKT.Auto

declare module '../HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [NonEmptyArrayURI]: NonEmptyArray<A>
  }
  interface URItoIndex<N, K> {
    readonly [NonEmptyArrayURI]: number
  }
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
  return A.isNonEmpty(as) ? O.some(as) : O.none()
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * fold :: Semigroup s => s a -> NonEmptyArray a -> a
 * ```
 */
export function fold<A>(S: P.Semigroup<A>): (as: NonEmptyArray<A>) => A {
  return (as) => A.foldLeft_(as.slice(1), as[0], S.combine_)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt_: <A>(fa: NonEmptyArray<A>, that: () => NonEmptyArray<A>) => NonEmptyArray<A> = A.alt_ as any

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
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
 * ```haskell
 * pure :: a -> NonEmptyArray a
 * ```
 *
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
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap_: <A, B>(fab: NonEmptyArray<(a: A) => B>, fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.ap_ as any

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
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
 * ```haskell
 * extract :: (Comonad m) => m a -> a
 * ```
 *
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
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const extend_: <A, B>(
  wa: NonEmptyArray<A>,
  f: (wa: NonEmptyArray<A>) => B
) => NonEmptyArray<B> = A.extend_ as any

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const extend: <A, B>(
  f: (wa: NonEmptyArray<A>) => B
) => (wa: NonEmptyArray<A>) => NonEmptyArray<B> = A.extend as any

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 *
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
 * ```haskell
 * filterWithIndex_ :: (NonEmptyArray f, Index k) =>
 *    (f a, ((k, a) -> Boolean)) -> Option (f a)
 * ```
 */
export function filterWithIndex_<A, B extends A>(
  fa: NonEmptyArray<A>,
  f: RefinementWithIndex<number, A, B>
): O.Option<NonEmptyArray<B>>
export function filterWithIndex_<A>(fa: NonEmptyArray<A>, f: PredicateWithIndex<number, A>): O.Option<NonEmptyArray<A>>
export function filterWithIndex_<A>(
  fa: NonEmptyArray<A>,
  f: PredicateWithIndex<number, A>
): O.Option<NonEmptyArray<A>> {
  return fromArray(A.filterWithIndex_(fa, f))
}

/**
 * ```haskell
 * filterWithIndex :: (NonEmptyArray f, Index k) =>
 *    ((k, a) -> Boolean) -> f a -> Option (f a)
 * ```
 */
export function filterWithIndex<A, B extends A>(
  f: RefinementWithIndex<number, A, B>
): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<B>>
export function filterWithIndex<A>(
  f: PredicateWithIndex<number, A>
): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>>
export function filterWithIndex<A>(
  f: PredicateWithIndex<number, A>
): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (fa) => filterWithIndex_(fa, f)
}

/**
 * ```haskell
 * filter_ :: NonEmptyArray f => (f a, (a -> Boolean)) -> Option (f a)
 * ```
 */
export function filter_<A, B extends A>(fa: NonEmptyArray<A>, f: Refinement<A, B>): O.Option<NonEmptyArray<B>>
export function filter_<A>(fa: NonEmptyArray<A>, f: Predicate<A>): O.Option<NonEmptyArray<A>>
export function filter_<A>(fa: NonEmptyArray<A>, f: Predicate<A>): O.Option<NonEmptyArray<A>> {
  return filterWithIndex_(fa, (_, a) => f(a))
}

/**
 * ```haskell
 * filter :: NonEmptyArray f => (a -> Boolean) -> f a -> Option (f a)
 * ```
 */
export function filter<A, B extends A>(f: Refinement<A, B>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<B>>
export function filter<A>(f: Predicate<A>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>>
export function filter<A>(f: Predicate<A>): (fa: NonEmptyArray<A>) => O.Option<NonEmptyArray<A>> {
  return (fa) => filterWithIndex_(fa, (_, a) => f(a))
}

/*
 * -------------------------------------------
 * Foldable NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * foldLeftWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, b, a) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldLeftWithIndex_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, i: number, a: A) => B) => B =
  A.foldLeftWithIndex_

/**
 * ```haskell
 * foldLeftWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldLeftWithIndex: <A, B>(b: B, f: (b: B, i: number, a: A) => B) => (fa: NonEmptyArray<A>) => B =
  A.foldLeftWithIndex

/**
 * ```haskell
 * foldLeft_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldLeft_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, a: A) => B) => B = A.foldLeft_

/**
 * ```haskell
 * foldLeft :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldLeft: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: NonEmptyArray<A>) => B = A.foldLeft

/**
 * ```haskell
 * foldRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, a, b) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldRightWithIndex_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, i: number, b: B) => B) => B =
  A.foldRightWithIndex_

/**
 * ```haskell
 * foldRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldRightWithIndex: <A, B>(b: B, f: (a: A, i: number, b: B) => B) => (fa: NonEmptyArray<A>) => B =
  A.foldRightWithIndex

/**
 * ```haskell
 * foldRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldRight_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, b: B) => B) => B = A.foldRight_

/**
 * ```haskell
 * foldRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: NonEmptyArray<A>) => B = A.foldRight

/**
 * ```haskell
 * foldMapWithIndex_ :: (Semigroup s, FoldableWithIndex f, Index k) =>
 *    s b -> (f a, ((k, a) -> b) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function foldMapWithIndex_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (i: number, a: A) => S) => S {
  return (fa, f) => A.foldLeftWithIndex_(fa.slice(1), f(0, fa[0]), (s, i, a) => S.combine_(s, f(i + 1, a)))
}

/**
 * ```haskell
 * foldMapWithIndex :: (Semigroup s, FoldableWithIndex f, Index k) =>
 *    s b -> ((k, a) -> b) -> f a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function foldMapWithIndex<S>(S: P.Semigroup<S>): <A>(f: (i: number, a: A) => S) => (fa: NonEmptyArray<A>) => S {
  return (f) => (fa) => foldMapWithIndex_(S)(fa, f)
}

/**
 * ```haskell
 * foldMap_ :: (Semigroup s, Foldable f) => s b -> (f a, (a -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap_<S>(S: P.Semigroup<S>): <A>(fa: NonEmptyArray<A>, f: (a: A) => S) => S {
  return (fa, f) => A.foldLeft_(fa.slice(1), f(fa[0]), (s, a) => S.combine_(s, f(a)))
}

/**
 * ```haskell
 * foldMap :: (Semigroup s, Foldable f) => s b -> (a -> b) -> f a -> b
 * ```
 *
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
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `NonEmptyArray`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: <A>(mma: NonEmptyArray<NonEmptyArray<A>>) => NonEmptyArray<A> = A.flatten as any

export const flatMapWithIndex_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (i: number, a: A) => NonEmptyArray<B>
) => NonEmptyArray<B> = A.flatMapWithIndex_ as any

export const flatMapWithIndex: <A, B>(
  f: (i: number, a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.flatMapWithIndex as any

/**
 * ```haskell
 * flatMap_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatMap_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (a: A) => NonEmptyArray<B>
) => NonEmptyArray<B> = A.flatMap_ as any

/**
 * ```haskell
 * flatMap :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatMap: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.flatMap as any

/*
 * -------------------------------------------
 * Traversable NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverseWithIndex_ :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> (t k a, ((k, a) -> g b))
 *    -> g (t k b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex_: P.TraverseWithIndexFn_<[NonEmptyArrayURI], V> = A.traverseWithIndex_ as any

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> ((k, a) -> g b)
 *    -> t k a
 *    -> g (t k b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex: P.TraverseWithIndexFn<[NonEmptyArrayURI], V> = A.traverseWithIndex as any

/**
 * ```haskell
 * traverse_ :: (Applicative g, Traversable t) =>
 *    g
 *    -> (t a, (a -> g b))
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[NonEmptyArrayURI], V> = A.traverse_ as any

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g
 *    -> (a -> g b)
 *    -> g a
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[NonEmptyArrayURI], V> = A.traverse as any

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[NonEmptyArrayURI], V> = A.sequence as any

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

/**
 * ```haskell
 * unit :: () -> NonEmptyArray ()
 * ```
 *
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
    const r: Array<NonEmptyArray<A>> = []
    let head: A = as[0]
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
    const r: Record<string, [A, ...ReadonlyArray<A>]> = {}
    for (const a of as) {
      const k = f(a)
      if (_hasOwnProperty.call(r, k)) {
        r[k].push(a)
      } else {
        r[k] = [a]
      }
    }
    return r
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
