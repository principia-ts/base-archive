/**
 * _Option_ represents an optional value. It consists of constructors _None_
 * representing an empty value, and _Some_ representing the original datatype
 */

import type { Either } from './Either'
import type { Eq } from './Eq'
import type { MorphismN, Predicate, Refinement } from './Function'
import type { OptionURI } from './Modules'
import type { Show } from './Show'
import type { These } from './These'

import { makeEq } from './Eq'
import { _bind, flow, identity, pipe, tuple } from './Function'
import * as HKT from './HKT'
import * as O from './internal/option'
import * as P from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
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

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Constructs a new `Option` holding no value (a.k.a `None`)
 *
 * @category Constructors
 * @since 1.0.0
 */
export const None = O.None

/**
 * Constructs a new `Option` holding a `Some` value.
 *
 * @category Constructs
 * @since 1.0.0
 */
export const Some = O.Some

/**
 * Constructs a new `Option` from a nullable value. If the value is `null` or `undefined`, returns `None`, otherwise
 * returns the value wrapped in a `Some`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable<A>(a: A | null | undefined): Option<NonNullable<A>> {
  return a == null ? None() : Some(a as NonNullable<A>)
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
    return Some(thunk())
  } catch (_) {
    return None()
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
export function tryCatchK<A extends ReadonlyArray<unknown>, B>(f: MorphismN<A, B>): (...args: A) => Option<B> {
  return (...a) => tryCatch(() => f(...a))
}

/**
 * Constructs a new `Option` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate_<A, B extends A>(a: A, refinement: Refinement<A, B>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A> {
  return predicate(a) ? None() : Some(a)
}

/**
 * Returns a smart constructor based on the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate<A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A> {
  return (a) => fromPredicate_(a, predicate)
}

/**
 * Constructs a new `Option` from an `Either`, transforming a `Left` into a `None` and a `Right` into a `Some`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromEither<E, A>(ma: Either<E, A>): Option<A> {
  return ma._tag === 'Left' ? None() : Some(ma.right)
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
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
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
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
 * -------------------------------------------
 * Align
 * -------------------------------------------
 */

export function alignWith_<A, B, C>(fa: Option<A>, fb: Option<B>, f: (_: These<A, B>) => C): Option<C> {
  return fa._tag === 'None'
    ? fb._tag === 'None'
      ? None()
      : Some(f({ _tag: 'Right', right: fb.value }))
    : fb._tag === 'None'
    ? Some(f({ _tag: 'Left', left: fa.value }))
    : Some(f({ _tag: 'Both', left: fa.value, right: fb.value }))
}

export function alignWith<A, B, C>(fb: Option<B>, f: (_: These<A, B>) => C): (fa: Option<A>) => Option<C> {
  return (fa) => alignWith_(fa, fb, f)
}

export function align_<A, B>(fa: Option<A>, fb: Option<B>): Option<These<A, B>> {
  return alignWith_(fa, fb, identity)
}

export function align<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<These<A, B>> {
  return (fa) => align_(fa, fb)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
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
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * Lifts a pure expression info an `Option`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): Option<A> {
  return Some(a)
}

/*
 * -------------------------------------------
 * Applicative Except
 * -------------------------------------------
 */

export function fail<E = never, A = never>(_: E): Option<A> {
  return None()
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
    flow(
      f,
      getOrElse((): Option<A | B> => fa)
    )
  )
}

export function catchSome<B>(f: () => Option<Option<B>>): <A>(fa: Option<A>) => Option<A | B> {
  return (fa) => catchSome_(fa, f)
}

export function catchMap_<A, B>(fa: Option<A>, f: () => B): Option<A | B> {
  return catchAll_(fa, () => Some(f()))
}

export function catchMap<B>(f: () => B): <A>(fa: Option<A>) => Option<A | B> {
  return (fa) => catchMap_(fa, f)
}

export function attempt<A>(fa: Option<A>): Option<Either<void, A>> {
  return catchAll_(
    map_(fa, (a) => ({ _tag: 'Right', right: a })),
    () => Some({ _tag: 'Left', left: undefined })
  )
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * Applies both `Option`s and if both are `Some`, collects their values into a tuple, otherwise, returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */
export function cross_<A, B>(fa: Option<A>, fb: Option<B>): Option<readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
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
  return fa._tag === 'Some' && fb._tag === 'Some' ? Some(f(fa.value, fb.value)) : None()
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

/**
 * A pipeable version of `sequenceS`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apS<N extends string, A, B>(
  name: Exclude<N, keyof A>,
  fb: Option<B>
): (
  fa: Option<A>
) => Option<
  {
    [K in keyof A | N]: K extends keyof A ? A[K] : B
  }
> {
  return flow(
    map((a) => (b: B) => _bind(a, name, b)),
    ap(fb)
  )
}

/*
 * -------------------------------------------
 * Compactable
 * -------------------------------------------
 */

export function separate<A, B>(fa: Option<Either<A, B>>): readonly [Option<A>, Option<B>] {
  const o = map_(fa, (e) => [getLeft(e), getRight(e)] as const)
  return isNone(o) ? [None(), None()] : o.value
}

export const compact: <A>(ta: Option<Option<A>>) => Option<A> = flatten

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

export function getEq<A>(E: Eq<A>): Eq<Option<A>> {
  return makeEq((x, y) => (x === y || isNone(x) ? isNone(y) : isNone(y) ? false : E.equals_(x.value, y.value)))
}

/*
 * -------------------------------------------
 * Extend
 * -------------------------------------------
 */
export function extend_<A, B>(wa: Option<A>, f: (wa: Option<A>) => B): Option<B> {
  return isNone(wa) ? None() : Some(f(wa))
}

/**
 */
export function extend<A, B>(f: (wa: Option<A>) => B): (wa: Option<A>) => Option<B> {
  return (wa) => extend_(wa, f)
}

/**
 */
export function duplicate<A>(wa: Option<A>): Option<Option<A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function filter_<A, B extends A>(fa: Option<A>, refinement: Refinement<A, B>): Option<B>
export function filter_<A>(fa: Option<A>, predicate: Predicate<A>): Option<A>
export function filter_<A>(fa: Option<A>, predicate: Predicate<A>): Option<A> {
  return isNone(fa) ? None() : predicate(fa.value) ? fa : None()
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: Option<A>) => Option<B>
export function filter<A>(predicate: Predicate<A>): (fa: Option<A>) => Option<A>
export function filter<A>(predicate: Predicate<A>): (fa: Option<A>) => Option<A> {
  return (fa) => filter_(fa, predicate)
}

export function partition_<A, B extends A>(fa: Option<A>, refinement: Refinement<A, B>): readonly [Option<A>, Option<B>]
export function partition_<A>(fa: Option<A>, predicate: Predicate<A>): readonly [Option<A>, Option<A>]
export function partition_<A>(fa: Option<A>, predicate: Predicate<A>): readonly [Option<A>, Option<A>] {
  return [filter_(fa, (a) => !predicate(a)), filter_(fa, predicate)]
}

export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (fa: Option<A>) => readonly [Option<A>, Option<B>]
export function partition<A>(predicate: Predicate<A>): (fa: Option<A>) => readonly [Option<A>, Option<A>]
export function partition<A>(predicate: Predicate<A>): (fa: Option<A>) => readonly [Option<A>, Option<A>] {
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
  return isNone(fa) ? None() : f(fa.value)
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
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<A, B>(fa: Option<A>, f: (a: A) => B): Option<B> {
  return isNone(fa) ? fa : Some(f(fa.value))
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
 * -------------------------------------------
 * Monad
 * -------------------------------------------
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
    pipe(
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
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * Monad Except
 * -------------------------------------------
 */

export function absolve<E, A>(fa: Option<Either<E, A>>): Option<A> {
  return bind_(fa, (a) => (a._tag === 'Left' ? None() : Some(a.right)))
}

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

export function getApplyMonoid<A>(M: P.Monoid<A>): P.Monoid<Option<A>> {
  return {
    ...getApplySemigroup(M),
    nat: Some(M.nat)
  }
}

export function getFirstMonoid<A = never>(): P.Monoid<Option<A>> {
  return {
    combine_: (x, y) => (isNone(y) ? x : y),
    combine: (y) => (x) => (isNone(y) ? x : y),
    nat: None()
  }
}

export function getLastMonoid<A = never>(): P.Monoid<Option<A>> {
  return {
    combine_: (x, y) => (isNone(x) ? y : x),
    combine: (y) => (x) => (isNone(x) ? y : x),
    nat: None()
  }
}

export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<Option<A>> {
  const combine_ = (x: Option<A>, y: Option<A>) => (isNone(x) ? y : isNone(y) ? x : Some(S.combine_(x.value, y.value)))
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y),
    nat: None()
  }
}

/*
 * -------------------------------------------
 * Senigroup
 * -------------------------------------------
 */

export function getApplySemigroup<A>(S: P.Semigroup<A>): P.Semigroup<Option<A>> {
  const combine_ = (x: Option<A>, y: Option<A>) =>
    isSome(x) && isSome(y) ? Some(S.combine_(x.value, y.value)) : None()
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

export function getShow<A>(S: Show<A>): Show<Option<A>> {
  return {
    show: (a) => (isNone(a) ? 'None' : `Some(${S.show(a.value)})`)
  }
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[HKT.URI<OptionURI>]> = (G) => (ta, f) =>
  isNone(ta) ? G.pure(None()) : pipe(f(ta.value), G.map(Some))

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[HKT.URI<OptionURI>]> = (G) => (f) => (ta) => traverse_(G)(ta, f)

/**
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[HKT.URI<OptionURI>]> = (G) => (fa) =>
  isNone(fa) ? G.pure(None()) : pipe(fa.value, G.map(Some))

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Option<void> {
  return Some(undefined)
}

/*
 * -------------------------------------------
 * Witherable
 * -------------------------------------------
 */

export const compactA_: P.WitherFn_<[HKT.URI<OptionURI>]> = (A) => (wa, f) =>
  isNone(wa) ? A.pure(None()) : f(wa.value)

export const compactA: P.WitherFn<[HKT.URI<OptionURI>]> = (A) => (f) => (wa) => compactA_(A)(wa, f)

export const separateA_: P.WiltFn_<[HKT.URI<OptionURI>]> = (A) => (wa, f) => {
  const o = map_(
    wa,
    flow(
      f,
      A.map((e) => tuple(getLeft(e), getRight(e)))
    )
  )
  return isNone(o) ? A.pure(tuple(None(), None())) : o.value
}

export const separateA: P.WiltFn<[HKT.URI<OptionURI>]> = (A) => (f) => (wa) => separateA_(A)(wa, f)

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Map over a Option with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bindNullableK_<A, B>(fa: Option<A>, f: (a: A) => B | null | undefined): Option<B> {
  return isNone(fa) ? None() : fromNullable(f(fa.value))
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
  return fea._tag === 'Right' ? None() : Some(fea.left)
}

/**
 * Evaluates an `Either` and returns a `Option` carrying the right value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getRight<E, A>(fea: Either<E, A>): Option<A> {
  return fea._tag === 'Left' ? None() : Some(fea.right)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Align: P.Align<[HKT.URI<OptionURI>]> = P.Align({
  map_,
  alignWith_,
  nil: None
})

export const Functor: P.Functor<[HKT.URI<OptionURI>]> = P.Functor({
  map_
})

export const Alt: P.Alt<[HKT.URI<OptionURI>]> = P.Alt({
  map_,
  alt_
})

export const SemimonoidalFunctor: P.SemimonoidalFunctor<[HKT.URI<OptionURI>]> = P.SemimonoidalFunctor({
  map_,
  crossWith_,
  cross_
})

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const mapN      = P.mapNF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)

export const Apply: P.Apply<[HKT.URI<OptionURI>]> = P.Apply({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor: P.MonoidalFunctor<[HKT.URI<OptionURI>]> = P.MonoidalFunctor({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative: P.Applicative<[HKT.URI<OptionURI>]> = P.Applicative({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativeExcept: P.ApplicativeExcept<[HKT.URI<OptionURI>], HKT.Fix<'E', void>> = P.ApplicativeExcept({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  catchAll_,
  fail
})

export const Monad: P.Monad<[HKT.URI<OptionURI>]> = P.Monad({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten
})

export const MonadExcept: P.MonadExcept<[HKT.URI<OptionURI>], HKT.Fix<'E', void>> = P.MonadExcept({
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

export const Do = P.deriveDo(Monad)

const of: Option<{}> = Some({})
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

export const Filterable: P.Filterable<[HKT.URI<OptionURI>]> = HKT.instance({
  filterMap_,
  filter_,
  partitionMap_,
  partition_,
  filter,
  filterMap,
  partition,
  partitionMap
})

export const Foldable: P.Foldable<[HKT.URI<OptionURI>]> = HKT.instance({
  foldl_,
  foldr_,
  foldMap_,
  foldl,
  foldr,
  foldMap
})

export const Traversable: P.Traversable<[HKT.URI<OptionURI>]> = P.Traversable({
  map_,
  traverse_
})

export const Witherable: P.Witherable<[HKT.URI<OptionURI>]> = HKT.instance({
  separateA_,
  compactA_,
  separateA,
  compactA
})

export { OptionURI } from './Modules'
