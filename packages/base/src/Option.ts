/**
 * _Option_ represents an optional value. It consists of constructors _None_
 * representing an empty value, and _Some_ representing the original datatype
 */

import type { Either } from './Either'
import type { FunctionN } from './function'
import type * as HKT from './HKT'
import type { OptionURI } from './Modules'
import type { These } from './These'

import * as G from './Guard'
import * as O from './internal/Option'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export interface None {
  readonly _tag: 'None'
}

export interface Some<A> {
  readonly _tag: 'Some'
  readonly value: A
}

export type Option<A> = None | Some<A>

export type InferSome<T extends Option<any>> = T extends Some<infer A> ? A : never

type URI = [HKT.URI<OptionURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Constructs a new `Option` holding no value (a.k.a `None`)
 *
 * @category Constructors
 * @since 1.0.0
 */
export const none = O.none

/**
 * Constructs a new `Option` holding a `Some` value.
 *
 * @category Constructs
 * @since 1.0.0
 */
export const some = O.some

/**
 * Constructs a new `Option` from a nullable value. If the value is `null` or `undefined`, returns `None`, otherwise
 * returns the value wrapped in a `Some`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable<A>(a: A | null | undefined): Option<NonNullable<A>> {
  return a == null ? none() : some(a as NonNullable<A>)
}

export function fromNullableK<A extends ReadonlyArray<unknown>, B>(
  f: (...args: A) => B | null | undefined
): (...args: A) => Option<NonNullable<B>> {
  return (...args) => fromNullable(f(...args))
}

/**
 * Constructs a new `Option` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatch<A>(thunk: () => A): Option<A> {
  try {
    return some(thunk())
  } catch (_) {
    return none()
  }
}

/**
 * Transforms a non-curried function that may throw, takes a set of arguments `(a, b, ...)`,
 * and returns a value `c`, into a non-curried function that will not throw,
 * takes a set of arguments `(a, b, ...)`, and returns an `Option`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK<A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, B>): (...args: A) => Option<B> {
  return (...a) => tryCatch(() => f(...a))
}

/**
 * Constructs a new `Option` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate_ = O.fromPredicate_

/**
 * Returns a smart constructor based on the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate = O.fromPredicate

/**
 * Constructs a new `Option` from an `Either`, transforming a `Left` into a `None` and a `Right` into a `Some`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromEither<E, A>(ma: Either<E, A>): Option<A> {
  return ma._tag === 'Left' ? none() : some(ma.right)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guards
 * -------------------------------------------------------------------------------------------------
 */

export function isNone<A>(fa: Option<A>): fa is None {
  return fa._tag === 'None'
}

export function isSome<A>(fa: Option<A>): fa is Some<A> {
  return fa._tag === 'Some'
}

export function isOption(u: unknown): u is Option<unknown> {
  return typeof u === 'object' && u != null && '_tag' in u && (u['_tag'] === 'Some' || u['_tag'] === 'None')
}

/*
 * -------------------------------------------------------------------------------------------------
 * Destructors
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Takes a default value, a function, and an `Option` value,
 * if the `Option` value is `None` the default value is returned,
 * otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function match_<A, B, C>(fa: Option<A>, onNone: () => B, onSome: (a: A) => C): B | C {
  return isNone(fa) ? onNone() : onSome(fa.value)
}

/**
 * Takes a default value, a function, and an `Option` value,
 * if the `Option` value is `None` the default value is returned,
 * otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function match<A, B, C>(onNone: () => B, onSome: (a: A) => C): (fa: Option<A>) => B | C {
  return (fa) => match_(fa, onNone, onSome)
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toNullable<A>(fa: Option<A>): A | null {
  return isNone(fa) ? null : fa.value
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `undefined`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toUndefined<A>(fa: Option<A>): A | undefined {
  return isNone(fa) ? undefined : fa.value
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export const getOrElse_ = O.getOrElse_

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export const getOrElse = O.getOrElse

/*
 * -------------------------------------------------------------------------------------------------
 * Align
 * -------------------------------------------------------------------------------------------------
 */

export function alignWith_<A, B, C>(fa: Option<A>, fb: Option<B>, f: (_: These<A, B>) => C): Option<C> {
  return fa._tag === 'None'
    ? fb._tag === 'None'
      ? none()
      : some(f({ _tag: 'Right', right: fb.value }))
    : fb._tag === 'None'
    ? some(f({ _tag: 'Left', left: fa.value }))
    : some(f({ _tag: 'Both', left: fa.value, right: fb.value }))
}

export function alignWith<A, B, C>(fb: Option<B>, f: (_: These<A, B>) => C): (fa: Option<A>) => Option<C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<A, B>(fa: Option<A>, fb: Option<B>): Option<These<A, B>> {
  return alignWith_(fa, fb, P.identity)
}

export function align<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Combines two `Option` values
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<A>(fa1: Option<A>, fa2: () => Option<A>): Option<A> {
  return orElse_(fa1, fa2)
}

/**
 * Combines two `Option` values
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<A>(fa2: () => Option<A>): (fa1: Option<A>) => Option<A> {
  return (fa1) => alt_(fa1, fa2)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a pure expression info an `Option`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): Option<A> {
  return some(a)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative Except
 * -------------------------------------------------------------------------------------------------
 */

export function fail<E = never, A = never>(_: E): Option<A> {
  return none()
}

export function catchAll_<A, B>(fa: Option<A>, f: () => Option<B>): Option<A | B> {
  return orElse_(fa, f)
}

export function catchAll<B>(f: () => Option<B>): <A>(fa: Option<A>) => Option<A | B> {
  return (fa) => catchAll_(fa, f)
}

export function catchSome_<A, B>(fa: Option<A>, f: () => Option<Option<B>>): Option<A | B> {
  return catchAll_(
    fa,
    P.flow(
      f,
      getOrElse((): Option<A | B> => fa)
    )
  )
}

export function catchSome<B>(f: () => Option<Option<B>>): <A>(fa: Option<A>) => Option<A | B> {
  return (fa) => catchSome_(fa, f)
}

export function catchMap_<A, B>(fa: Option<A>, f: () => B): Option<A | B> {
  return catchAll_(fa, () => some(f()))
}

export function catchMap<B>(f: () => B): <A>(fa: Option<A>) => Option<A | B> {
  return (fa) => catchMap_(fa, f)
}

export function attempt<A>(fa: Option<A>): Option<Either<void, A>> {
  return catchAll_(
    map_(fa, (a) => ({ _tag: 'Right', right: a })),
    () => some({ _tag: 'Left', left: undefined })
  )
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Applies both `Option`s and if both are `Some`, collects their values into a tuple, otherwise, returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross_<A, B>(fa: Option<A>, fb: Option<B>): Option<readonly [A, B]> {
  return crossWith_(fa, fb, P.tuple)
}

/**
 * Applies both `Option`s and if both are `Some`, collects their values into a tuple, otherwise returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<A, B>(fab: Option<(a: A) => B>, fa: Option<A>): Option<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

/**
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<A>(fa: Option<A>): <B>(fab: Option<(a: A) => B>) => Option<B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<A, B>(fa: Option<A>, fb: Option<B>): Option<A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function apl<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<A, B>(fa: Option<A>, fb: Option<B>): Option<B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function apr<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<B> {
  return (fa) => apr_(fa, fb)
}

/**
 * Applies both `Option`s and if both are `Some`,  maps their results with function `f`, otherwise returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */
export function crossWith_<A, B, C>(fa: Option<A>, fb: Option<B>, f: (a: A, b: B) => C): Option<C> {
  return fa._tag === 'Some' && fb._tag === 'Some' ? some(f(fa.value, fb.value)) : none()
}

/**
 * Applies both `Option`s and if both are `Some`, maps their results with function `f`, otherwise returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */

export function crossWith<A, B, C>(fb: Option<B>, f: (a: A, b: B) => C): (fa: Option<A>) => Option<C> {
  return (fa) => crossWith_(fa, fb, f)
}

/**
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export function liftA2<A, B, C>(f: (a: A) => (b: B) => C): (fa: Option<A>) => (fb: Option<B>) => Option<C> {
  return (fa) => (fb) => crossWith_(fa, fb, (a, b) => f(a)(b))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Compactable
 * -------------------------------------------------------------------------------------------------
 */

export function separate<A, B>(fa: Option<Either<A, B>>): readonly [Option<A>, Option<B>] {
  const o = map_(fa, (e) => [getLeft(e), getRight(e)] as const)
  return isNone(o) ? [none(), none()] : o.value
}

export const compact: <A>(ta: Option<Option<A>>) => Option<A> = flatten

/*
 * -------------------------------------------------------------------------------------------------
 * Eq
 * -------------------------------------------------------------------------------------------------
 */

export function getEq<A>(E: P.Eq<A>): P.Eq<Option<A>> {
  return P.Eq((x, y) => (x === y || isNone(x) ? isNone(y) : isNone(y) ? false : E.equals_(x.value, y.value)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Extend
 * -------------------------------------------------------------------------------------------------
 */
export function extend_<A, B>(wa: Option<A>, f: (wa: Option<A>) => B): Option<B> {
  return isNone(wa) ? none() : some(f(wa))
}

/**
 */
export function extend<A, B>(f: (wa: Option<A>) => B): (wa: Option<A>) => Option<B> {
  return (wa) => extend_(wa, f)
}

/**
 */
export function duplicate<A>(wa: Option<A>): Option<Option<A>> {
  return extend_(wa, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<A, B extends A>(fa: Option<A>, refinement: P.Refinement<A, B>): Option<B>
export function filter_<A>(fa: Option<A>, predicate: P.Predicate<A>): Option<A>
export function filter_<A>(fa: Option<A>, predicate: P.Predicate<A>): Option<A> {
  return isNone(fa) ? none() : predicate(fa.value) ? fa : none()
}

export function filter<A, B extends A>(refinement: P.Refinement<A, B>): (fa: Option<A>) => Option<B>
export function filter<A>(predicate: P.Predicate<A>): (fa: Option<A>) => Option<A>
export function filter<A>(predicate: P.Predicate<A>): (fa: Option<A>) => Option<A> {
  return (fa) => filter_(fa, predicate)
}

export function partition_<A, B extends A>(
  fa: Option<A>,
  refinement: P.Refinement<A, B>
): readonly [Option<A>, Option<B>]
export function partition_<A>(fa: Option<A>, predicate: P.Predicate<A>): readonly [Option<A>, Option<A>]
export function partition_<A>(fa: Option<A>, predicate: P.Predicate<A>): readonly [Option<A>, Option<A>] {
  return [filter_(fa, (a) => !predicate(a)), filter_(fa, predicate)]
}

export function partition<A, B extends A>(
  refinement: P.Refinement<A, B>
): (fa: Option<A>) => readonly [Option<A>, Option<B>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Option<A>) => readonly [Option<A>, Option<A>]
export function partition<A>(predicate: P.Predicate<A>): (fa: Option<A>) => readonly [Option<A>, Option<A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<A, B, C>(fa: Option<A>, f: (a: A) => Either<B, C>): readonly [Option<B>, Option<C>] {
  return separate(map_(fa, f))
}

export function partitionMap<A, B, C>(f: (a: A) => Either<B, C>): (fa: Option<A>) => readonly [Option<B>, Option<C>] {
  return (fa) => partitionMap_(fa, f)
}

/**
 */
export function filterMap_<A, B>(fa: Option<A>, f: (a: A) => Option<B>): Option<B> {
  return isNone(fa) ? none() : f(fa.value)
}

/**
 */
export function filterMap<A, B>(f: (a: A) => Option<B>): (fa: Option<A>) => Option<B> {
  return (fa) => filterMap_(fa, f)
}

/**
 */
export function foldl_<A, B>(fa: Option<A>, b: B, f: (b: B, a: A) => B): B {
  return isNone(fa) ? b : f(b, fa.value)
}

/**
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Option<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

/**
 */
export function foldr_<A, B>(fa: Option<A>, b: B, f: (a: A, b: B) => B): B {
  return isNone(fa) ? b : f(fa.value, b)
}

/**
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Option<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/**
 */
export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Option<A>, f: (a: A) => M) => M {
  return (fa, f) => (isNone(fa) ? M.nat : f(fa.value))
}

/**
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Option<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<A, B>(fa: Option<A>, f: (a: A) => B): Option<B> {
  return isNone(fa) ? fa : some(f(fa.value))
}

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): (fa: Option<A>) => Option<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Uncurried Monad
 * @since 1.0.0
 */
export function bind_<A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<B> {
  return isNone(ma) ? ma : f(ma.value)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind<A, B>(f: (a: A) => Option<B>): (ma: Option<A>) => Option<B> {
  return (ma) => bind_(ma, f)
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<A> {
  return bind_(ma, (a) =>
    P.pipe(
      f(a),
      map(() => a)
    )
  )
}

/**
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap<A, B>(f: (a: A) => Option<B>): (ma: Option<A>) => Option<A> {
  return (ma) => tap_(ma, f)
}

/**
 * Removes one level of nesting from a nested `Option`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<A>(mma: Option<Option<A>>): Option<A> {
  return bind_(mma, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad Except
 * -------------------------------------------------------------------------------------------------
 */

export function absolve<E, A>(fa: Option<Either<E, A>>): Option<A> {
  return bind_(fa, (a) => (a._tag === 'Left' ? none() : some(a.right)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monoid
 * -------------------------------------------------------------------------------------------------
 */

export function getApplyMonoid<A>(M: P.Monoid<A>): P.Monoid<Option<A>> {
  return {
    ...getApplySemigroup(M),
    nat: some(M.nat)
  }
}

export function getFirstMonoid<A = never>(): P.Monoid<Option<A>> {
  return {
    combine_: (x, y) => (isNone(y) ? x : y),
    combine: (y) => (x) => isNone(y) ? x : y,
    nat: none()
  }
}

export function getLastMonoid<A = never>(): P.Monoid<Option<A>> {
  return {
    combine_: (x, y) => (isNone(x) ? y : x),
    combine: (y) => (x) => isNone(x) ? y : x,
    nat: none()
  }
}

export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<Option<A>> {
  const combine_ = (x: Option<A>, y: Option<A>) => (isNone(x) ? y : isNone(y) ? x : some(S.combine_(x.value, y.value)))
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y),
    nat: none()
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Senigroup
 * -------------------------------------------------------------------------------------------------
 */

export function getApplySemigroup<A>(S: P.Semigroup<A>): P.Semigroup<Option<A>> {
  const combine_ = (x: Option<A>, y: Option<A>) =>
    isSome(x) && isSome(y) ? some(S.combine_(x.value, y.value)) : none()
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Show
 * -------------------------------------------------------------------------------------------------
 */

export function getShow<A>(S: P.Show<A>): P.Show<Option<A>> {
  return {
    show: (a) => (isNone(a) ? 'None' : `Some(${S.show(a.value)})`)
  }
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<URI> = (G) => (ta, f) =>
  isNone(ta) ? G.pure(none()) : P.pipe(f(ta.value), G.map(some))

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<URI> = (G) => (f) => (ta) => traverse_(G)(ta, f)

/**
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<URI> = (G) => (fa) => isNone(fa) ? G.pure(none()) : P.pipe(fa.value, G.map(some))

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): Option<void> {
  return some(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Witherable
 * -------------------------------------------------------------------------------------------------
 */

export const compactA_: P.WitherFn_<URI> = (A) => (wa, f) => isNone(wa) ? A.pure(none()) : f(wa.value)

export const compactA: P.WitherFn<URI> = (A) => (f) => (wa) => compactA_(A)(wa, f)

export const separateA_: P.WiltFn_<URI> = (A) => (wa, f) => {
  const o = map_(
    wa,
    P.flow(
      f,
      A.map((e) => P.tuple(getLeft(e), getRight(e)))
    )
  )
  return isNone(o) ? A.pure(P.tuple(none(), none())) : o.value
}

export const separateA: P.WiltFn<URI> = (A) => (f) => (wa) => separateA_(A)(wa, f)

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

/**
 * Map over a Option with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bindNullableK_<A, B>(fa: Option<A>, f: (a: A) => B | null | undefined): Option<B> {
  return isNone(fa) ? none() : fromNullable(f(fa.value))
}

/**
 * Map over a Option with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bindNullableK<A, B>(f: (a: A) => B | null | undefined): (fa: Option<A>) => Option<B> {
  return (fa) => bindNullableK_(fa, f)
}

/**
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElse_<A, B>(fa: Option<A>, onNone: () => Option<B>): Option<A | B> {
  return isNone(fa) ? onNone() : fa
}

/**
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElse<B>(onNone: () => Option<B>): <A>(fa: Option<A>) => Option<B | A> {
  return (fa) => orElse_(fa, onNone)
}

/**
 * Evaluates an `Either` and returns a `Option` carrying the left value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getLeft<E, A>(fea: Either<E, A>): Option<E> {
  return fea._tag === 'Right' ? none() : some(fea.left)
}

/**
 * Evaluates an `Either` and returns a `Option` carrying the right value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getRight<E, A>(fea: Either<E, A>): Option<A> {
  return fea._tag === 'Left' ? none() : some(fea.right)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Guard
 * -------------------------------------------------------------------------------------------------
 */

export function getGuard<A>(guard: G.Guard<unknown, A>): G.Guard<unknown, Option<A>> {
  return G.Guard((u): u is Option<A> => isOption(u) && (u._tag === 'None' || guard.is(u.value)))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Align = P.Align<URI>({
  map_,
  alignWith_,
  nil: none
})

export const Functor = P.Functor<URI>({
  map_
})

export const Alt = P.Alt<URI>({
  map_,
  alt_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_
})

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const mapN      = P.mapNF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)

export const Apply = P.Apply<URI>({
  map_,
  crossWith_,
  cross_,
  ap_
})

/**
 * A pipeable version of `sequenceS`
 *
 * @category Apply
 * @since 1.0.0
 */
export const apS: <N extends string, A, B>(
  name: Exclude<N, keyof A>,
  fb: Option<B>
) => (fa: Option<A>) => Option<
  {
    [K in keyof A | N]: K extends keyof A ? A[K] : B
  }
> = P.apSF(Apply)

export const MonoidalFunctor = P.MonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativeExcept = P.ApplicativeExcept<URI, HKT.Fix<'E', void>>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  catchAll_,
  fail
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten
})

export const MonadExcept = P.MonadExcept<URI, HKT.Fix<'E', void>>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  catchAll_,
  fail
})

export const Do = P.Do(Monad)

const of: Option<{}> = some({})
export { of as do }

/**
 * Contributes a computation to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const bindS = P.bindSF(Monad)

/**
 * Contributes a pure value to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const letS = P.letSF(Monad)

/**
 * Binds a computation to a property in a `Record`.
 *
 * @category Do
 * @since 1.0.0
 */
export const bindToS = P.bindToSF(Monad)

export const Filterable = P.Filterable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_
})

export const Foldable = P.Foldable<URI>({
  foldl_,
  foldr_,
  foldMap_
})

export const Traversable = P.Traversable<URI>({
  map_,
  traverse_
})

export const Witherable = P.Witherable<URI>({
  map_,
  filter_,
  filterMap_,
  partition_,
  partitionMap_,
  traverse_,
  compactA_,
  separateA_
})

export { OptionURI } from './Modules'
