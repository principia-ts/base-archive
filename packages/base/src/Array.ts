import type { Byte } from './Byte'
import type { Either } from './Either'
import type { Eq } from './Eq/core'
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from './Function'
import type { ArrayURI } from './Modules'
import type { NonEmptyArray } from './NonEmptyArray'
import type { Option } from './Option'
import type { Show } from './Show/core'
import type { These } from './These'

import * as D from './Derivation/genWithHistoryF'
import { _bind, _bindTo, flow, identity, pipe, tuple, unsafeCoerce } from './Function'
import * as HKT from './HKT'
import * as O from './Option'
import * as Ord from './Ord'
import { EQ } from './Ordering'
import * as P from './typeclass'
import { fromCompare, makeMonoid, ordNumber } from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type InferA<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer A> ? A : never

export type URI = ArrayURI

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * A function that returns a type-safe empty Array
 *
 * @category Constructors
 * @since 1.0.0
 */
export function empty<A>(): ReadonlyArray<A> {
  return []
}

/**
 * Constructs a new readpnly array from an interable.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function from<A>(as: Iterable<A>): ReadonlyArray<A> {
  return Array.from(as)
}

export function fromBuffer(as: Uint8Array): ReadonlyArray<Byte> {
  return unsafeCoerce(Array.from(as))
}

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function makeBy<A>(n: number, f: (i: number) => A): ReadonlyArray<A> {
  const r: Array<A> = []
  for (let i = 0; i < n; i++) {
    r.push(f(i))
  }
  return r
}

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @category Constructors
 * @since 1.0.0
 */
export function range(start: number, end: number): ReadonlyArray<number> {
  return makeBy(end - start + 1, (i) => start + i)
}

/**
 * Create an array containing a value repeated the specified number of times
 *
 * @category Constructors
 * @since 1.0.0
 */
export function replicate<A>(n: number, a: A): ReadonlyArray<A> {
  return makeBy(n, () => a)
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export function isOutOfBound_<A>(as: ReadonlyArray<A>, i: number): boolean {
  return i < 0 || i >= as.length
}

export function isOutOfBound(i: number): <A>(as: ReadonlyArray<A>) => boolean {
  return (as) => isOutOfBound_(as, i)
}

export function isEmpty<A>(as: ReadonlyArray<A>): boolean {
  return as.length === 0
}

export function isNonEmpty<A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> {
  return as.length > 0
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

/**
 */
export function unit(): ReadonlyArray<void> {
  return [undefined]
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<A>(fa: ReadonlyArray<A>, that: () => ReadonlyArray<A>): ReadonlyArray<A> {
  return concat_(fa, that())
}

/**
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 * @dataFirst alt_
 */
export function alt<A>(that: () => ReadonlyArray<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * Lifts a value into an Array
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): ReadonlyArray<A> {
  return [a]
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<A, B>(fab: ReadonlyArray<(a: A) => B>, fa: ReadonlyArray<A>): ReadonlyArray<B> {
  return bind_(fab, (f) => map_(fa, f))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst ap_
 */
export function ap<A>(fa: ReadonlyArray<A>): <B>(fab: ReadonlyArray<(a: A) => B>) => ReadonlyArray<B> {
  return (fab) => ap_(fab, fa)
}

/**
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apl_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

/**
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst apl_
 */
export function apl<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return flow(
    map((a) => () => a),
    ap(fb)
  )
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apr_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
}

/**
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 * @dataFirst apr_
 */
export function apr<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return flow(
    map(() => (b: B) => b),
    ap(fb)
  )
}

export function crossWith_<A, B, C>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): ReadonlyArray<C> {
  return bind_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): (fa: ReadonlyArray<A>) => ReadonlyArray<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function zipWith_<A, B, C>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>, f: (a: A, b: B) => C): ReadonlyArray<C> {
  const mut_fc = []
  const len    = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    mut_fc[i] = f(fa[i], fb[i])
  }
  return mut_fc
}

/**
 * @dataFirst zipWith_
 */
export function zipWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): (fa: ReadonlyArray<A>) => ReadonlyArray<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zip_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b])
}

/**
 * @dataFirst zip_
 */
export function zip<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

/*
 * -------------------------------------------
 * Compactable
 * -------------------------------------------
 */

/**
 */
export function compact<A>(as: ReadonlyArray<Option<A>>): ReadonlyArray<A> {
  return filterMap_(as, identity)
}

/**
 */
export function separate<E, A>(fa: ReadonlyArray<Either<E, A>>): readonly [ReadonlyArray<E>, ReadonlyArray<A>] {
  const len   = fa.length
  const left  = []
  const right = []
  for (let i = 0; i < len; i++) {
    const e = fa[i]
    if (e._tag === 'Left') {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return [left, right]
}

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

const of: ReadonlyArray<{}> = pure({})
export { of as do }

export function bindS<A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => ReadonlyArray<A>
): (
  mk: ReadonlyArray<K>
) => ReadonlyArray<
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> {
  return bind((a) =>
    pipe(
      f(a),
      map((b) => _bind(a, name, b))
    )
  )
}

export function bindTo<K, N extends string>(
  name: Exclude<N, keyof K>
): <A>(
  fa: ReadonlyArray<A>
) => ReadonlyArray<
  {
    [k in Exclude<N, keyof K>]: A
  }
> {
  return map(_bindTo(name))
}

export function letS<K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
): (mk: ReadonlyArray<K>) => ReadonlyArray<{ [k in N | keyof K]: k extends keyof K ? K[k] : A }> {
  return bindS(name, flow(f, pure))
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

export function getEq<A>(E: Eq<A>): Eq<ReadonlyArray<A>> {
  const equals_ = (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): boolean =>
    xs === ys || (xs.length === ys.length && xs.every((x, i) => E.equals_(x, ys[i])))
  return {
    equals_,
    equals: (ys) => (xs) => equals_(xs, ys)
  }
}

/*
 * -------------------------------------------
 * Extend
 * -------------------------------------------
 */

export function extend_<A, B>(wa: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): ReadonlyArray<B> {
  return imap_(wa, (i, _) => f(wa.slice(i)))
}

/**
 * extend :: Extend w => (w a -> b) -> w a -> w b
 */
export function extend<A, B>(f: (as: ReadonlyArray<A>) => B): (wa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (wa) => extend_(wa, f)
}

/**
 */
export function duplicate<A>(wa: ReadonlyArray<A>): ReadonlyArray<ReadonlyArray<A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilter_<A, B extends A>(fa: ReadonlyArray<A>, f: RefinementWithIndex<number, A, B>): ReadonlyArray<B>
export function ifilter_<A>(fa: ReadonlyArray<A>, f: PredicateWithIndex<number, A>): ReadonlyArray<A>
export function ifilter_<A>(fa: ReadonlyArray<A>, f: PredicateWithIndex<number, A>): ReadonlyArray<A> {
  const result: Array<A> = []
  for (let i = 0; i < fa.length; i++) {
    const a = fa[i]
    if (f(i, a)) {
      result.push(a)
    }
  }
  return result
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilter<A, B extends A>(
  f: RefinementWithIndex<number, A, B>
): (fa: ReadonlyArray<A>) => ReadonlyArray<B>
export function ifilter<A>(f: PredicateWithIndex<number, A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>
export function ifilter<A>(f: PredicateWithIndex<number, A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (fa) => ifilter_(fa, f)
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filter_<A, B extends A>(fa: ReadonlyArray<A>, f: Refinement<A, B>): ReadonlyArray<B>
export function filter_<A>(fa: ReadonlyArray<A>, f: Predicate<A>): ReadonlyArray<A>
export function filter_<A>(fa: ReadonlyArray<A>, f: Predicate<A>): ReadonlyArray<A> {
  return ifilter_(fa, (_, a) => f(a))
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filter<A, B extends A>(f: Refinement<A, B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B>
export function filter<A>(f: Predicate<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>
export function filter<A>(f: Predicate<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (fa) => ifilter_(fa, (_, a) => f(a))
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilterMap_<A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => Option<B>): ReadonlyArray<B> {
  const result = []
  for (let i = 0; i < fa.length; i++) {
    const optionB = f(i, fa[i])
    if (optionB._tag === 'Some') {
      result.push(optionB.value)
    }
  }
  return result
}

/**
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export function ifilterMap<A, B>(f: (i: number, a: A) => Option<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => ifilterMap_(fa, f)
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filterMap_<A, B>(fa: ReadonlyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 * @category Filterable
 * @since 1.0.0
 */
export function filterMap<A, B>(f: (a: A) => Option<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => ifilterMap_(fa, (_, a) => f(a))
}

/**
 */
export function ipartition_<A, B extends A>(
  ta: ReadonlyArray<A>,
  refinement: RefinementWithIndex<number, A, B>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function ipartition_<A>(
  ta: ReadonlyArray<A>,
  predicate: PredicateWithIndex<number, A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function ipartition_<A>(
  ta: ReadonlyArray<A>,
  predicate: PredicateWithIndex<number, A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  const left: Array<A>  = []
  const right: Array<A> = []
  for (let i = 0; i < ta.length; i++) {
    const a = ta[i]
    if (predicate(i, a)) {
      right.push(a)
    } else {
      left.push(a)
    }
  }
  return [left, right]
}

/**
 */
export function ipartition<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function ipartition<A>(
  predicate: PredicateWithIndex<number, A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function ipartition<A>(
  predicate: PredicateWithIndex<number, A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (ta) => ipartition_(ta, predicate)
}

/**
 */
export function partition_<A, B extends A>(
  ta: ReadonlyArray<A>,
  refinement: Refinement<A, B>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function partition_<A>(
  ta: ReadonlyArray<A>,
  predicate: Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function partition_<A>(
  ta: ReadonlyArray<A>,
  predicate: Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return ipartition_(ta, (_, a) => predicate(a))
}

/**
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<B>]
export function partition<A>(
  predicate: Predicate<A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function partition<A>(
  predicate: Predicate<A>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (ta) => ipartition_(ta, (_, a) => predicate(a))
}

/**
 */
export function ipartitionMap_<A, B, C>(
  ta: ReadonlyArray<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  const left  = []
  const right = []
  for (let i = 0; i < ta.length; i++) {
    const e = f(i, ta[i])
    if (e._tag === 'Left') {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return [left, right]
}

/**
 */
export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => Either<B, C>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  return (ta) => ipartitionMap_(ta, f)
}

/**
 */
export function partitionMap_<A, B, C>(
  ta: ReadonlyArray<A>,
  f: (a: A) => Either<B, C>
): readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  return ipartitionMap_(ta, (_, a) => f(a))
}

/**
 */
export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (ta: ReadonlyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<C>] {
  return (ta) => ipartitionMap_(ta, (_, a) => f(a))
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
export function ifoldl_<A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, i: number, a: A) => B): B {
  const len = fa.length
  let r     = b
  for (let i = 0; i < len; i++) {
    r = f(r, i, fa[i])
  }
  return r
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldl<A, B>(b: B, f: (b: B, i: number, a: A) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldl_<A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => ifoldl_(fa, b, (b, _, a) => f(b, a))
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldr_<A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, i: number, b: B) => B): B {
  let r = b
  for (let i = fa.length - 1; i >= 0; i--) {
    r = f(fa[i], i, r)
  }
  return r
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldr<A, B>(b: B, f: (a: A, i: number, b: B) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => ifoldr_(fa, b, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldr_<A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): B {
  return ifoldr_(fa, b, (a, _, b) => f(a, b))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: ReadonlyArray<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap_<M>(M: P.Monoid<M>): <A>(fa: ReadonlyArray<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => ifoldl_(fa, M.nat, (b, i, a) => M.combine_(b, f(i, a)))
}

/**
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export function ifoldMap<M>(M: P.Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: ReadonlyArray<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: ReadonlyArray<A>, f: (a: A) => M) => M {
  const ifoldMapM_ = ifoldMap_(M)
  return (fa, f) => ifoldMapM_(fa, (_, a) => f(a))
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: ReadonlyArray<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/**
 * @category Foldable
 * @since 1.0.0
 */
export function fold<M>(M: P.Monoid<M>): (fa: ReadonlyArray<M>) => M {
  return (fa) => ifoldl_(fa, M.nat, (b, _, a) => M.combine_(b, a))
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function imap_<A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => B): ReadonlyArray<B> {
  const len    = fa.length
  const mut_bs = new Array(len)
  for (let i = 0; i < len; i++) {
    mut_bs[i] = f(i, fa[i])
  }
  return mut_bs
}

/**
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function imap<A, B>(f: (i: number, a: A) => B): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => imap_(fa, f)
}

/**
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<A, B>(fa: ReadonlyArray<A>, f: (a: A) => B): ReadonlyArray<B> {
  return imap_(fa, (_, a) => f(a))
}

/**
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function ibind_<A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => ReadonlyArray<B>): ReadonlyArray<B> {
  let outLen     = 0
  const len      = fa.length
  const mut_temp = new Array(len)
  for (let i = 0; i < len; i++) {
    const e     = fa[i]
    const arr   = f(i, e)
    outLen     += arr.length
    mut_temp[i] = arr
  }
  const mut_out = Array(outLen)
  let start     = 0
  for (let i = 0; i < len; i++) {
    const arr = mut_temp[i]
    const l   = arr.length
    for (let j = 0; j < l; j++) {
      mut_out[j + start] = arr[j]
    }
    start += l
  }
  return mut_out
}

export function ibind<A, B>(f: (i: number, a: A) => ReadonlyArray<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => ibind_(fa, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind_<A, B>(fa: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<B> {
  return ibind_(fa, (_, a) => f(a))
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind<A, B>(f: (a: A) => ReadonlyArray<B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => bind_(fa, f)
}

/**
 * Removes one level of nesting from a nested `NonEmptyArray`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<A>(mma: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A> {
  let rLen  = 0
  const len = mma.length
  for (let i = 0; i < len; i++) {
    rLen += mma[i].length
  }
  const mut_r = Array(rLen)
  let start   = 0
  for (let i = 0; i < len; i++) {
    const arr = mma[i]
    const l   = arr.length
    for (let j = 0; j < l; j++) {
      mut_r[j + start] = arr[j]
    }
    start += l
  }
  return mut_r
}

// /**
//  * Composes computations in sequence, using the return value of one computation as input for the next
//  * and keeping only the result of the first
//  *
//  * @category Monad
//  * @since 1.0.0
//  */
// export function tap_<A, B>(ma: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<A> {
//   return bind_(ma, (a) =>
//     pipe(
//       f(a),
//       map(() => a)
//     )
//   )
// }

// /**
//  * Composes computations in sequence, using the return value of one computation as input for the next
//  * and keeping only the result of the first
//  *
//  * @category Monad
//  * @since 1.0.0
//  */
// export function tap<A, B>(f: (a: A) => ReadonlyArray<B>): (ma: ReadonlyArray<A>) => ReadonlyArray<A> {
//   return (ma) => tap_(ma, f)
// }

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

export function getMonoid<A = never>(): P.Monoid<ReadonlyArray<A>> {
  return makeMonoid(concat_, empty())
}

/*
 * -------------------------------------------
 * Ord
 * -------------------------------------------
 */

/**
 * Derives an `Ord` over the `Array` of a given element type from the `Ord` of that type. The ordering between two such
 * arrays is equal to: the first non equal comparison of each arrays elements taken pairwise in increasing order, in
 * case of equality over all the pairwise elements; the longest array is considered the greatest, if both arrays have
 * the same length, the result is equality.
 *
 * @category Ord
 * @since 1.0.0
 */
export function getOrd<A>(O: P.Ord<A>): P.Ord<ReadonlyArray<A>> {
  return fromCompare((a, b) => {
    const aLen = a.length
    const bLen = b.length
    const len  = Math.min(aLen, bLen)
    for (let i = 0; i < len; i++) {
      const ordering = O.compare_(a[i], b[i])
      if (ordering === EQ) {
        return ordering
      }
    }
    return ordNumber.compare_(aLen, bLen)
  })
}

/*
 * -------------------------------------------
 * Semialign
 * -------------------------------------------
 */

export function alignWith_<A, B, C>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>,
  f: (_: These<A, B>) => C
): ReadonlyArray<C> {
  const mut_ret: Array<C> = []
  const minlen            = Math.min(fa.length, fb.length)
  const maxlen            = Math.max(fa.length, fb.length)
  for (let i = 0; i < minlen; i++) {
    mut_ret.push(f({ _tag: 'Both', left: fa[i], right: fb[i] }))
  }
  if (minlen === maxlen) {
    return mut_ret
  } else if (fa.length > fb.length) {
    for (let i = minlen; i < maxlen; i++) {
      mut_ret.push(f({ _tag: 'Left', left: fa[i] }))
    }
  } else {
    for (let i = minlen; i < maxlen; i++) {
      mut_ret.push(f({ _tag: 'Right', right: fb[i] }))
    }
  }
  return mut_ret
}

export function alignWith<A, B, C>(
  fb: ReadonlyArray<B>,
  f: (_: These<A, B>) => C
): (fa: ReadonlyArray<A>) => ReadonlyArray<C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<These<A, B>> {
  return alignWith_(fa, fb, identity)
}

export function align<B>(fb: ReadonlyArray<B>): <A>(fa: ReadonlyArray<A>) => ReadonlyArray<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

/**
 * @category Show
 * @since 1.0.0
 */
export function getShow<A>(S: Show<A>): Show<ReadonlyArray<A>> {
  return {
    show: (as) => `[${as.map(S.show).join(', ')}]`
  }
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

/**
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const itraverse_ = P.implementTraverseWithIndex_<[HKT.URI<ArrayURI>]>()((_) => (G) => {
  return (ta, f) =>
    ifoldl_(ta, G.pure(empty<typeof _.B>()), (fbs, i, a) =>
      G.ap_(
        G.map_(fbs, (bs) => (b: typeof _.B) => snoc_(bs, b)),
        f(i, a)
      )
    )
})

/**
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const itraverse: P.TraverseWithIndexFn<[HKT.URI<ArrayURI>]> = (G) => {
  const itraverseG_ = itraverse_(G)
  return (f) => (ta) => itraverseG_(ta, f)
}

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[HKT.URI<ArrayURI>]> = (G) => {
  const itraverseG_ = itraverse_(G)
  return (ta, f) => itraverseG_(ta, (_, a) => f(a))
}

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[HKT.URI<ArrayURI>]> = (G) => {
  const itraverseG_ = itraverse_(G)
  return (f) => (ta) => itraverseG_(ta, (_, a) => f(a))
}

/**
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence = P.implementSequence<[HKT.URI<ArrayURI>]>()((_) => (G) => {
  const traverseG = traverse(G)
  return traverseG(identity)
})

/*
 * -------------------------------------------
 * Unfoldable
 * -------------------------------------------
 */

export function unfold<A, B>(b: B, f: (b: B) => Option<readonly [A, B]>): ReadonlyArray<A> {
  const ret = []
  let bb    = b
  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    const mt = f(bb)
    if (mt._tag === 'Some') {
      const [a, b] = mt.value
      ret.push(a)
      bb = b
    } else {
      break
    }
  }
  return ret
}

/*
 * -------------------------------------------
 * Witherable
 * -------------------------------------------
 */

/**
 */
export const icompactA_: P.WitherWithIndexFn_<[HKT.URI<ArrayURI>]> = (G) => {
  const traverseG = itraverse_(G)
  return (wa, f) => pipe(traverseG(wa, f), G.map(compact))
}

/**
 */
export const icompactA: P.WitherWithIndexFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => icompactA_(G)(wa, f)

/**
 */
export const compactA_: P.WitherFn_<[HKT.URI<ArrayURI>]> = (G) => (wa, f) => icompactA_(G)(wa, (_, a) => f(a))

/**
 */
export const compactA: P.WitherFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => compactA_(G)(wa, f)

/**
 */
export const iseparateA_: P.WiltWithIndexFn_<[HKT.URI<ArrayURI>]> = (G) => {
  const traverseG = itraverse_(G)
  return (wa, f) => pipe(traverseG(wa, f), G.map(separate))
}

/**
 */
export const iseparateA: P.WiltWithIndexFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => iseparateA_(G)(wa, f)

/**
 */
export const separateA_: P.WiltFn_<[HKT.URI<ArrayURI>]> = (G) => (wa, f) => iseparateA_(G)(wa, (_, a) => f(a))

/**
 */
export const separateA: P.WiltFn<[HKT.URI<ArrayURI>]> = (G) => (f) => (wa) => separateA_(G)(wa, f)

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function append_<A>(as: ReadonlyArray<A>, a: A): ReadonlyArray<A> {
  return concat_(as, [a])
}

/**
 * @dataFirst append_
 */
export function append<A>(a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => append_(as, a)
}

export function chop_<A, B>(
  as: ReadonlyArray<A>,
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): ReadonlyArray<B> {
  const result: Array<B>   = []
  let cs: ReadonlyArray<A> = as
  while (isNonEmpty(cs)) {
    const [b, c] = f(cs)
    result.push(b)
    cs = c
  }
  return result
}

export function chop<A, B>(
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => chop_(as, f)
}

export function chunksOf(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> {
  return (as) => (as.length === 0 ? empty() : isOutOfBound_(as, n - 1) ? [as] : chop_(as, splitAt(n)))
}

export function collectWhile_<A, B>(as: ReadonlyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B> {
  const result: Array<B> = []
  for (let i = 0; i < as.length; i++) {
    const o = f(as[i])
    if (o._tag === 'Some') {
      result.push(o.value)
    } else {
      break
    }
  }
  return result
}

export function collectWhile<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => collectWhile_(as, f)
}

export function comprehension<A, B, C, D, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>, ReadonlyArray<D>],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, C, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): ReadonlyArray<R>
export function comprehension<A, R>(
  input: readonly [ReadonlyArray<A>],
  f: (a: A) => boolean,
  g?: (a: A) => R
): ReadonlyArray<R>
export function comprehension<R>(
  input: ReadonlyArray<ReadonlyArray<any>>,
  f: (...xs: ReadonlyArray<any>) => R,
  g: (...xs: ReadonlyArray<any>) => boolean = () => true
): ReadonlyArray<R> {
  const go = (scope: ReadonlyArray<any>, input: ReadonlyArray<ReadonlyArray<any>>): ReadonlyArray<R> => {
    if (input.length === 0) {
      return g(...scope) ? [f(...scope)] : empty()
    } else {
      return bind_(input[0], (x) => go(snoc_(scope, x), input.slice(1)))
    }
  }
  return go(empty(), input)
}

export function concat_<A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> {
  const lenx = xs.length
  if (lenx === 0) {
    return ys
  }
  const leny = ys.length
  if (leny === 0) {
    return xs
  }
  const mut_r = Array(lenx + leny)
  for (let i = 0; i < lenx; i++) {
    mut_r[i] = xs[i]
  }
  for (let i = 0; i < leny; i++) {
    mut_r[i + lenx] = ys[i]
  }
  return mut_r
}

/**
 * @dataFirst concat_
 */
export function concat<A>(ys: ReadonlyArray<A>): (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (xs) => concat_(xs, ys)
}

export function cons_<A>(head: A, tail: ReadonlyArray<A>): NonEmptyArray<A> {
  const len   = tail.length
  const mut_r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    mut_r[i + 1] = tail[i]
  }
  mut_r[0] = head
  return (mut_r as unknown) as NonEmptyArray<A>
}

export function cons<A>(tail: ReadonlyArray<A>): (head: A) => NonEmptyArray<A> {
  return (head) => cons_(head, tail)
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @since 1.0.0
 */
export function deleteAt_<A>(as: ReadonlyArray<A>, i: number): Option<ReadonlyArray<A>> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(unsafeDeleteAt_(as, i))
}

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @since 1.0.0
 */
export function deleteAt(i: number): <A>(as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => deleteAt_(as, i)
}

export function difference_<A>(E: Eq<A>): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE_ = elem_(E)
  return (xs, ys) => filter_(xs, (a) => !elemE_(ys, a))
}

export function difference<A>(E: Eq<A>): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  const differenceE_ = difference_(E)
  return (ys) => (xs) => differenceE_(xs, ys)
}

export function drop_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(n, as.length)
}

export function drop(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => drop_(as, n)
}

export function dropLast_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(0, as.length - n)
}

export function dropLast(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropLast_(as, n)
}

export function dropWhile_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): ReadonlyArray<A> {
  const i        = spanIndexLeft_(as, predicate)
  const l        = as.length
  const mut_rest = Array(l - i)
  for (let j = i; j < l; j++) {
    mut_rest[j - i] = as[j]
  }
  return mut_rest
}

export function dropWhile<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropWhile_(as, predicate)
}

export function dropLastWhile_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): ReadonlyArray<A> {
  const i        = spanIndexRight_(as, predicate)
  const mut_rest = Array(i + 1)
  for (let j = 0; j <= i; j++) {
    mut_rest[j] = as[j]
  }
  return mut_rest
}

export function dropLastWhile<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropLastWhile_(as, predicate)
}

/**
 * Test if a value is a member of an array. Takes a `Eq<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `ReadonlyArray<A>`.
 *
 * @since 1.0.0
 */
export function elem_<A>(E: Eq<A>): (as: ReadonlyArray<A>, a: A) => boolean {
  return (as, a) => {
    const predicate = (element: A) => E.equals(element)(a)
    let i           = 0
    const len       = as.length
    for (; i < len; i++) {
      if (predicate(as[i])) {
        return true
      }
    }
    return false
  }
}

/**
 * Test if a value is a member of an array. Takes a `Eq<A>` as a single
 * argument which returns the function to use to search for a value of type `A` in
 * an array of type `ReadonlyArray<A>`.
 *
 * @since 1.0.0
 */
export function elem<A>(E: Eq<A>): (a: A) => (as: ReadonlyArray<A>) => boolean {
  const elemE_ = elem_(E)
  return (a) => (as) => elemE_(as, a)
}

export function findFirst<A, B extends A>(refinement: Refinement<A, B>): (as: ReadonlyArray<A>) => Option<B>
export function findFirst<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A>
export function findFirst<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length
    for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
        return O.Some(as[i])
      }
    }
    return O.None()
  }
}

export function findFirstMap<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => {
    const len = as.length
    for (let i = len - 1; i >= 0; i--) {
      const v = f(as[i])
      if (O.isSome(v)) {
        return v
      }
    }
    return O.None()
  }
}

/**
 * Find the first index for which a predicate holds
 *
 * @since 1.0.0
 */
export function findFirstIndex_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): Option<number> {
  const len = as.length
  for (let i = 0; i < len; i++) {
    if (predicate(as[i])) {
      return O.Some(i)
    }
  }
  return O.None()
}

/**
 * Find the first index for which a predicate holds
 *
 * @since 1.0.0
 * @dataFirst findFirstIndex_
 */
export function findFirstIndex<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => findFirstIndex_(as, predicate)
}

export function findLast<A, B extends A>(refinement: Refinement<A, B>): (as: ReadonlyArray<A>) => Option<B>
export function findLast<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A>
export function findLast<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length
    for (let i = 0; i < len; i++) {
      if (predicate(as[i])) {
        return O.Some(as[i])
      }
    }
    return O.None()
  }
}

export function findLastMap<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => {
    const len = as.length
    for (let i = 0; i < len; i++) {
      const v = f(as[i])
      if (O.isSome(v)) {
        return v
      }
    }
    return O.None()
  }
}

/**
 * Find the last index for which a predicate holds
 *
 * @since 1.0.0
 */
export function findLastIndex_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): Option<number> {
  const len = as.length
  for (let i = len - 1; i >= 0; i--) {
    if (predicate(as[i])) {
      return O.Some(i)
    }
  }
  return O.None()
}

/**
 * Find the last index for which a predicate holds
 *
 * @since 1.0.0
 * @dataFirst findLastIndex_
 */
export function findLastIndex<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => findLastIndex_(as, predicate)
}

export function grouped_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<ReadonlyArray<A>> {
  const r: A[][] = []
  for (let i = 0; i < as.length; i += n) {
    r.push(as.slice(i, i + n))
  }
  return r
}

export function grouped(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> {
  return (as) => grouped_(as, n)
}

export function head<A>(as: ReadonlyArray<A>): Option<A> {
  return isEmpty(as) ? O.None() : O.Some(as[0])
}

export function init<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  const len = as.length
  return len === 0 ? O.None() : O.Some(as.slice(0, len - 1))
}

export function insertAt_<A>(as: ReadonlyArray<A>, i: number, a: A): Option<ReadonlyArray<A>> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(unsafeInsertAt_(as, i, a))
}

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @since 1.0.0
 * @dataFirst insertAt_
 */
export function insertAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => insertAt_(as, i, a)
}

export function intersection_<A>(E: Eq<A>): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE_ = elem_(E)
  return (xs, ys) => filter_(xs, (a) => elemE_(ys, a))
}

export function intersection<A>(E: Eq<A>): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  const intersectionE_ = intersection_(E)
  return (ys) => (xs) => intersectionE_(xs, ys)
}

export function intersperse_<A>(as: ReadonlyArray<A>, a: A): ReadonlyArray<A> {
  const len = as.length
  return len === 0 ? as : cons_(as[0], prependAll_(as.slice(1, len), a))
}

export function intersperse<A>(a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => intersperse_(as, a)
}

export function join_(as: ReadonlyArray<string>, s: string): string {
  return as.join(s)
}

export function join(s: string): (as: ReadonlyArray<string>) => string {
  return (as) => as.join(s)
}

export function lookup_<A>(as: ReadonlyArray<A>, i: number): Option<A> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(as[i])
}

/**
 * @dataFirst lookup_
 */
export function lookup(i: number): <A>(as: ReadonlyArray<A>) => Option<A> {
  return (as) => lookup_(as, i)
}

export function last<A>(as: ReadonlyArray<A>): Option<A> {
  return lookup_(as, as.length - 1)
}

/**
 * Extracts from an array of `Either` all the `Left` elements. All the `Right` elements are extracted in order
 *
 * @category Combinators
 * @since 1.0.0
 */
export function lefts<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<E> {
  const ls: Array<E> = []
  for (let i = 0; i < as.length; i++) {
    const a = as[i]
    if (a._tag === 'Left') {
      ls.push(a.left)
    }
  }
  return ls
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export function modifyAt_<A>(as: ReadonlyArray<A>, i: number, f: (a: A) => A): Option<ReadonlyArray<A>> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(unsafeUpdateAt_(as, i, f(as[i])))
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export function modifyAt<A>(i: number, f: (a: A) => A): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => modifyAt_(as, i, f)
}

export function prepend_<A>(as: ReadonlyArray<A>, a: A): ReadonlyArray<A> {
  return [a, ...as]
}

export function prepend<A>(a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => prepend_(as, a)
}

export function prependAll_<A>(as: ReadonlyArray<A>, a: A): ReadonlyArray<A> {
  const mut_out: Array<A> = []
  for (let i = 0; i < as.length; i++) {
    mut_out.push(a, as[i])
  }
  return mut_out
}

export function prependAll<A>(a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => prependAll_(as, a)
}

/**
 * Reverse an array, creating a new array
 *
 * @category Combinators
 * @since 1.0.0
 */
export function reverse<A>(as: ReadonlyArray<A>): ReadonlyArray<A> {
  return isEmpty(as) ? as : as.slice().reverse()
}

/**
 * Extracts from an array of `Either` all the `Right` elements. All the `Right` elements are extracted in order
 *
 * @category Combinators
 * @since 1.0.0
 */
export function rights<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<A> {
  const rs: Array<A> = []
  for (let i = 0; i < as.length; i++) {
    const a = as[i]
    if (a._tag === 'Right') {
      rs.push(a.right)
    }
  }
  return rs
}

export function rotate_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  const len = as.length
  if (n === 0 || len <= 1 || len === Math.abs(n)) {
    return as
  } else if (n < 0) {
    return rotate_(as, len + n)
  } else {
    return concat_(as.slice(-n), as.slice(0, len - n))
  }
}

export function size<A>(as: ReadonlyArray<A>): number {
  return as.length
}

export function scanl_<A, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): ReadonlyArray<B> {
  const l               = as.length
  const mut_r: Array<B> = new Array(l + 1)
  mut_r[0]              = b
  for (let i = 0; i < l; i++) {
    mut_r[i + 1] = f(mut_r[i], as[i])
  }
  return mut_r
}

export function scanl<A, B>(b: B, f: (b: B, a: A) => B): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => scanl_(as, b, f)
}

export function scanr_<A, B>(as: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): ReadonlyArray<B> {
  const l               = as.length
  const mut_r: Array<B> = new Array(l + 1)
  mut_r[l]              = b
  for (let i = l - 1; i >= 0; i--) {
    mut_r[i] = f(as[i], mut_r[i + 1])
  }
  return mut_r
}

export function scanr<A, B>(b: B, f: (a: A, b: B) => B): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => scanr_(as, b, f)
}

export function snoc_<A>(init: ReadonlyArray<A>, end: A): NonEmptyArray<A> {
  const len   = init.length
  const mut_r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    mut_r[i] = init[i]
  }
  mut_r[len] = end
  return (mut_r as unknown) as NonEmptyArray<A>
}

/**
 * @dataFirst snoc_
 */
export function snoc<A>(end: A): (init: ReadonlyArray<A>) => NonEmptyArray<A> {
  return (init) => snoc_(init, end)
}

/**
 * Sort the elements of an array in increasing order, creating a new array
 *
 * @category Combinators
 * @since 1.0.0
 */
export function sort<B>(O: Ord.Ord<B>): <A extends B>(as: readonly A[]) => readonly A[] {
  return (as) => (isEmpty(as) ? empty() : as.slice().sort((a, b) => O.compare(a)(b)))
}

/**
 * Sort the elements of an array in increasing order, where elements are compared using first `ords[0]`, then `ords[1]`,
 * etc...
 *
 * @category Combinators
 * @since 1.0.0
 */
export function sortBy<B>(ords: ReadonlyArray<P.Ord<B>>): <A extends B>(as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const M = Ord.getMonoid<B>()
    return sort(foldl_(ords, M.nat, (b, a) => M.combine_(a, b)))(as)
  }
}

export function span<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<B>, ReadonlyArray<A>]
export function span<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>]
export function span<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => {
    const i        = spanIndexLeft_(as, predicate)
    const mut_init = Array(i)
    for (let j = 0; j < i; j++) {
      mut_init[j] = as[j]
    }
    const l        = as.length
    const mut_rest = Array(l - i)
    for (let j = i; j < l; j++) {
      mut_rest[j - i] = as[j]
    }
    return [mut_init, mut_rest]
  }
}

export function spanIndexLeft_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): number {
  const l = as.length
  let i   = 0
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

export function spanIndexRight_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): number {
  let i = as.length - 1
  for (; i >= 0; i--) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

export function splitAt_<A>(as: ReadonlyArray<A>, n: number): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return [as.slice(0, n), as.slice(n)]
}

export function splitAt(n: number): <A>(as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => [as.slice(0, n), as.slice(n)]
}

export function sum(as: ReadonlyArray<number>): number {
  return foldl_(as, 0, (b, a) => b + a)
}

export function tail<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  return isEmpty(as) ? O.None() : O.Some(as.slice(1))
}

export function take_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(0, n)
}

/**
 * @dataFirst take_
 */
export function take(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => take_(as, n)
}

export function takeLast_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return isEmpty(as) ? empty() : as.slice(-n)
}

/**
 * @dataFirst takeLast_
 */
export function takeLast(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => takeLast_(as, n)
}

export function takeWhile_<A, B extends A>(as: ReadonlyArray<A>, refinement: Refinement<A, B>): ReadonlyArray<B>
export function takeWhile_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): ReadonlyArray<A>
export function takeWhile_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): ReadonlyArray<A> {
  const i        = spanIndexLeft_(as, predicate)
  const mut_init = Array(i)
  for (let j = 0; j < i; j++) {
    mut_init[j] = as[j]
  }
  return mut_init
}

export function takeWhile<A, B extends A>(refinement: Refinement<A, B>): (as: ReadonlyArray<A>) => ReadonlyArray<B>
export function takeWhile<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A>
export function takeWhile<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => takeWhile_(as, predicate)
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @since 1.0.0
 */
export function updateAt_<A>(as: ReadonlyArray<A>, i: number, a: A): Option<ReadonlyArray<A>> {
  return isOutOfBound_(as, i) ? O.None() : O.Some(unsafeUpdateAt_(as, i, a))
}

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @since 1.0.0
 * @dataFirst updateAt_
 */
export function updateAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => updateAt_(as, i, a)
}

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @since 1.0.0
 */
export function unzip<A, B>(as: ReadonlyArray<readonly [A, B]>): readonly [ReadonlyArray<A>, ReadonlyArray<B>] {
  const mut_fa: Array<A> = []
  const mut_fb: Array<B> = []

  for (let i = 0; i < as.length; i++) {
    mut_fa[i] = as[i][0]
    mut_fb[i] = as[i][1]
  }

  return [mut_fa, mut_fb]
}

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function uniq<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const elemS         = elem(E)
    const out: Array<A> = []
    const len           = as.length
    let i               = 0
    for (; i < len; i++) {
      const a = as[i]
      if (!elemS(a)(out)) {
        out.push(a)
      }
    }
    return len === out.length ? as : out
  }
}

export function union_<A>(E: Eq<A>): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE_ = elem_(E)
  return (xs, ys) =>
    concat_(
      xs,
      filter_(ys, (a) => !elemE_(xs, a))
    )
}

export function union<A>(E: Eq<A>): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  const unionE_ = union_(E)
  return (ys) => (xs) => unionE_(xs, ys)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Align: P.Align<[HKT.URI<ArrayURI>]> = HKT.instance({
  alignWith_,
  alignWith,
  align_,
  align,
  nil: empty
})

export const Functor: P.Functor<[HKT.URI<ArrayURI>]> = HKT.instance({
  invmap_: (fa, f, _) => map_(fa, f),
  invmap: <A, B>(f: (a: A) => B, _: (b: B) => A) => (fa: ReadonlyArray<A>) => map_(fa, f),
  map,
  map_
})

export const FunctorWithIndex: P.FunctorWithIndex<[HKT.URI<ArrayURI>]> = HKT.instance({
  imap,
  imap_
})

export const Apply: P.Apply<[HKT.URI<ArrayURI>]> = HKT.instance({
  ...Functor,
  ap,
  ap_,
  crossWith,
  crossWith_,
  cross_,
  cross
})

export const Zip: P.Zip<[HKT.URI<ArrayURI>]> = HKT.instance({
  zip_,
  zip,
  zipWith_,
  zipWith
})

export const Applicative: P.Applicative<[HKT.URI<ArrayURI>]> = HKT.instance({
  ...Functor,
  ...Apply,
  unit,
  pure
})

export const Alt: P.Alt<[HKT.URI<ArrayURI>]> = HKT.instance({
  ...Functor,
  alt_,
  alt
})

export const Alternative: P.Alternative<[HKT.URI<ArrayURI>]> = HKT.instance({
  ...Applicative,
  ...Alt,
  empty
})

export const Compactable: P.Compactable<[HKT.URI<ArrayURI>]> = HKT.instance({
  compact,
  separate
})

export const Filterable: P.Filterable<[HKT.URI<ArrayURI>]> = HKT.instance({
  filter_,
  filterMap_,
  partition_,
  partitionMap_,
  filter,
  filterMap,
  partition,
  partitionMap
})

export const FilterableWithIndex: P.FilterableWithIndex<[HKT.URI<ArrayURI>]> = HKT.instance({
  ifilter_,
  ifilterMap_,
  ipartitionMap_,
  ifilterMap,
  ifilter,
  ipartitionMap,
  ipartition_,
  ipartition
})

export const FoldableWithIndex: P.FoldableWithIndex<[HKT.URI<ArrayURI>]> = HKT.instance({
  ifoldl_,
  ifoldl,
  ifoldr,
  ifoldr_,
  ifoldMap,
  ifoldMap_
})

export const Foldable: P.Foldable<[HKT.URI<ArrayURI>]> = HKT.instance({
  foldl_,
  foldl,
  foldr_,
  foldr,
  foldMap_,
  foldMap
})

export const Monad: P.Monad<[HKT.URI<ArrayURI>]> = HKT.instance({
  ...Applicative,
  bind_,
  bind,
  flatten
})

export const Traversable: P.Traversable<[HKT.URI<ArrayURI>]> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
})

export const TraversableWithIndex: P.TraversableWithIndex<[HKT.URI<ArrayURI>]> = HKT.instance({
  ...FunctorWithIndex,
  itraverse_,
  itraverse
})

export const Unfoldable: P.Unfoldable<[HKT.URI<ArrayURI>]> = HKT.instance({
  unfold
})

/*
 * -------------------------------------------
 * Gen
 * -------------------------------------------
 */

const adapter: {
  <A>(_: () => O.Option<A>): D.GenLazyHKT<ReadonlyArray<A>, A>
  <A>(_: () => ReadonlyArray<A>): D.GenLazyHKT<ReadonlyArray<A>, A>
} = (_: () => any) =>
  new D.GenLazyHKT(() => {
    const x = _()
    if (O.isOption(x)) {
      return new D.GenLazyHKT(() => (x._tag === 'None' ? [] : [x.value]))
    }
    return x
  })

export const gen = D.genWithHistoryF(Monad, { adapter })

/*
 * -------------------------------------------
 * Unsafe
 * -------------------------------------------
 */

export function unsafeInsertAt_<A>(as: ReadonlyArray<A>, i: number, a: A): ReadonlyArray<A> {
  return mutate_(as, (xs) => {
    xs.splice(i, 0, a)
  })
}

export function unsafeUpdateAt_<A>(as: ReadonlyArray<A>, i: number, a: A): ReadonlyArray<A> {
  if (as[i] === a) {
    return as
  } else {
    return mutate_(as, (mut_xs) => {
      mut_xs[i] = a
    })
  }
}

export function unsafeDeleteAt_<A>(as: ReadonlyArray<A>, i: number): ReadonlyArray<A> {
  return mutate_(as, (xs) => {
    xs.splice(i, 1)
  })
}

/*
 * -------------------------------------------
 * Utilities
 * -------------------------------------------
 */

export function toBuffer(as: ReadonlyArray<Byte>): Uint8Array {
  return Uint8Array.from(unsafeCoerce(as))
}

/**
 * Transiently mutate the Array. Copies the input array, then exececutes `f` on it
 */
export function mutate_<A>(as: ReadonlyArray<A>, f: (as: Array<A>) => void): ReadonlyArray<A> {
  const mut_as = Array.from(as)
  f(mut_as)
  return mut_as
}

/**
 * Transiently mutate the Array. Copies the input array, then exececutes `f` on it
 */
export function mutate<A>(f: (as: Array<A>) => void): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => mutate_(as, f)
}
