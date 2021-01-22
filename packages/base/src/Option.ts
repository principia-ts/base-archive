/**
 * _Option_ represents an optional value. It consists of constructors _None_
 * representing an empty value, and _Some_ representing the original datatype
 */

import type { Either } from './Either'
import type { Eq } from './Eq'
import type { MorphismN, Predicate, Refinement } from './Function'
import type { Show } from './Show'

import { makeEq } from './Eq/core'
import { _bind, flow, identity, pipe, tuple as mkTuple } from './Function'
import * as HKT from './HKT'
import { makeShow } from './Show/core'
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

export const OptionURI = 'Option'

export type OptionURI = typeof OptionURI

export type V = HKT.Auto

declare module './HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [OptionURI]: Option<A>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * none :: <a> () -> None
 * ```
 *
 * Constructs a new `Option` holding no value (a.k.a `None`)
 *
 * @category Constructors
 * @since 1.0.0
 */
export function none<A = never>(): Option<A> {
  return {
    _tag: 'None'
  }
}

/**
 * ```haskell
 * some :: a -> Some a
 * ```
 *
 * Constructs a new `Option` holding a `Some` value.
 *
 * @category Constructs
 * @since 1.0.0
 */
export function some<A>(a: A): Option<A> {
  return {
    _tag: 'Some',
    value: a
  }
}

/**
 * ```haskell
 * fromNullable :: ?a -> Option a
 * ```
 *
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
 * ```haskell
 * tryCatch :: (() -> a) -> Option a
 * ```
 *
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
 * ```haskell
 * tryCatchK :: ((a, b, ...) -> c) -> ((a, b, ...) -> Option c)
 * ```
 *
 * Transforms a non-curried function that may throw, takes a set of arguments `(a, b, ...)`,
 * and returns a value `c`, into a non-curried function that will not throw,
 * takes a set of arguments `(a, b, ...)`, and returns a `Option`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK<A extends ReadonlyArray<unknown>, B>(f: MorphismN<A, B>): (...args: A) => Option<B> {
  return (...a) => tryCatch(() => f(...a))
}

/**
 * ```haskell
 * fromPredicate_ :: (a, (a -> is b)) -> Option b
 * fromPredicate_ :: (a, (a -> Boolean)) -> Option a
 * ```
 *
 * Constructs a new `Option` from a value and the given predicate
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate_<A, B extends A>(a: A, refinement: Refinement<A, B>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A>
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A> {
  return predicate(a) ? none() : some(a)
}

/**
 * ```haskell
 * fromPredicate :: (a -> is b) -> a -> Option b
 * fromPredicate :: (a -> Boolean) -> a -> Option a
 * ```
 *
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
 * ```haskell
 * fromEither :: Either e a -> Option a
 * ```
 *
 * Constructs a new `Option` from an `Either`, transforming a `Left` into a `None` and a `Right` into a `Some`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromEither<E, A>(ma: Either<E, A>): Option<A> {
  return ma._tag === 'Left' ? none() : some(ma.right)
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
 * ```haskell
 * fold_ :: (Option a, (() -> b), (a -> c)) -> b | c
 * ```
 *
 * Takes a default value, a function, and an `Option` value,
 * if the `Option` value is `None` the default value is returned,
 * otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold_<A, B, C>(fa: Option<A>, onNone: () => B, onSome: (a: A) => C): B | C {
  return isNone(fa) ? onNone() : onSome(fa.value)
}

/**
 * ```haskell
 * fold :: ((() -> b), (a -> c)) -> Option a -> b | c
 * ```
 *
 * Takes a default value, a function, and an `Option` value,
 * if the `Option` value is `None` the default value is returned,
 * otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold<A, B, C>(onNone: () => B, onSome: (a: A) => C): (fa: Option<A>) => B | C {
  return (fa) => fold_(fa, onNone, onSome)
}

/**
 * ```haskell
 * toNullable :: Option a -> a | Null
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toNullable<A>(fa: Option<A>): A | null {
  return isNone(fa) ? null : fa.value
}

/**
 * ```haskell
 * toUndefined :: Option a -> a | Undefined
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns `undefined`.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toUndefined<A>(fa: Option<A>): A | undefined {
  return isNone(fa) ? undefined : fa.value
}

/**
 * ```haskell
 * getOrElse_ :: (Option a, (() -> b)) -> a | b
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse_<A, B>(fa: Option<A>, onNone: () => B): A | B {
  return isNone(fa) ? onNone() : fa.value
}

/**
 * ```haskell
 * getOrElse :: (() -> b) -> Option a -> a | b
 * ```
 *
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse<B>(onNone: () => B): <A>(fa: Option<A>) => B | A {
  return (fa) => getOrElse_(fa, onNone)
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
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<A>(fa: Option<A>, that: () => Option<A>): Option<A> {
  return isNone(fa) ? that() : fa
}

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<A>(that: () => Option<A>): (fa: Option<A>) => Option<A> {
  return (fa) => alt_(fa, that)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `Option`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <A>(a: A) => Option<A> = some

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * ```haskell
 * product_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Option`s and if both are `Some`, collects their values into a tuple, otherwise, returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */
export function product_<A, B>(fa: Option<A>, fb: Option<B>): Option<readonly [A, B]> {
  return map2_(fa, fb, mkTuple)
}

/**
 * ```haskell
 * product :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `Option`s and if both are `Some`, collects their values into a tuple, otherwise returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */
export function product<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<readonly [A, B]> {
  return (fa) => product_(fa, fb)
}

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
export function ap_<A, B>(fab: Option<(a: A) => B>, fa: Option<A>): Option<B> {
  return isNone(fab) ? none() : isNone(fa) ? none() : some(fab.value(fa.value))
}

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
export function ap<A>(fa: Option<A>): <B>(fab: Option<(a: A) => B>) => Option<B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<A, B>(fa: Option<A>, fb: Option<B>): Option<A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

export function apl<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<A, B>(fa: Option<A>, fb: Option<B>): Option<B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
}

export function apr<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<B> {
  return (fa) => apr_(fa, fb)
}

/**
 * ```haskell
 * map2_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Option`s and if both are `Some`,  maps their results with function `f`, otherwise returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */
export function map2_<A, B, C>(fa: Option<A>, fb: Option<B>, f: (a: A, b: B) => C): Option<C> {
  return ap_(
    map_(fa, (a) => (b: B) => f(a, b)),
    fb
  )
}

/**
 * ```haskell
 * map2 :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `Option`s and if both are `Some`, maps their results with function `f`, otherwise returns `None`
 *
 * @category Apply
 * @since 1.0.0
 */

export function map2<A, B, C>(fb: Option<B>, f: (a: A, b: B) => C): (fa: Option<A>) => Option<C> {
  return (fa) => map2_(fa, fb, f)
}

/**
 * ```haskell
 * liftA2 :: Apply f => (a -> b -> c) -> f a -> f b -> f c
 * ```
 *
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export function liftA2<A, B, C>(f: (a: A) => (b: B) => C): (fa: Option<A>) => (fb: Option<B>) => Option<C> {
  return (fa) => (fb) => (isNone(fa) ? none() : isNone(fb) ? none() : some(f(fa.value)(fb.value)))
}

/**
 * ```haskell
 * apS :: (Apply f, Nominal n) =>
 *    (n n3, f c)
 *    -> f ({ n1: a, n2: b, ... })
 *    -> f ({ n1: a, n2: b, n3: c })
 * ```
 *
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
  return isNone(o) ? [none(), none()] : o.value
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
/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export function extend_<A, B>(wa: Option<A>, f: (wa: Option<A>) => B): Option<B> {
  return isNone(wa) ? none() : some(f(wa))
}

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export function extend<A, B>(f: (wa: Option<A>) => B): (wa: Option<A>) => Option<B> {
  return (wa) => extend_(wa, f)
}

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
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
  return isNone(fa) ? none() : predicate(fa.value) ? fa : none()
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
 * ```haskell
 * filterMap_ :: Filterable f => (f a, (a -> Option b)) -> f b
 * ```
 */
export function filterMap_<A, B>(fa: Option<A>, f: (a: A) => Option<B>): Option<B> {
  return isNone(fa) ? none() : f(fa.value)
}

/**
 * ```haskell
 * filterMap :: Filterable f => (a -> Option b) -> f a -> f b
 * ```
 */
export function filterMap<A, B>(f: (a: A) => Option<B>): (fa: Option<A>) => Option<B> {
  return (fa) => filterMap_(fa, f)
}

/**
 * ```haskell
 * foldl_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export function foldl_<A, B>(fa: Option<A>, b: B, f: (b: B, a: A) => B): B {
  return isNone(fa) ? b : f(b, fa.value)
}

/**
 * ```haskell
 * foldl :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Option<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

/**
 * ```haskell
 * foldr_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export function foldr_<A, B>(fa: Option<A>, b: B, f: (a: A, b: B) => B): B {
  return isNone(fa) ? b : f(fa.value, b)
}

/**
 * ```haskell
 * foldr :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Option<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/**
 * ```haskell
 * foldMap_ :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Option<A>, f: (a: A) => M) => M {
  return (fa, f) => (isNone(fa) ? M.nat : f(fa.value))
}

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
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
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<A, B>(fa: Option<A>, f: (a: A) => B): Option<B> {
  return isNone(fa) ? fa : some(f(fa.value))
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
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
 * ```haskell
 * bind_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Uncurried Monad
 * @since 1.0.0
 */
export function bind_<A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<B> {
  return isNone(ma) ? ma : f(ma.value)
}

/**
 * ```haskell
 * bind :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function bind<A, B>(f: (a: A) => Option<B>): (ma: Option<A>) => Option<B> {
  return (ma) => bind_(ma, f)
}

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
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
 * ```haskell
 * tap :: Monad m => m a -> (a -> m b) -> m a
 * ```
 *
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
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
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
 * Monoid
 * -------------------------------------------
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
    combine: (y) => (x) => (isNone(y) ? x : y),
    nat: none()
  }
}

export function getLastMonoid<A = never>(): P.Monoid<Option<A>> {
  return {
    combine_: (x, y) => (isNone(x) ? y : x),
    combine: (y) => (x) => (isNone(x) ? y : x),
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
 * -------------------------------------------
 * Senigroup
 * -------------------------------------------
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
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

export function getShow<A>(S: Show<A>): Show<Option<A>> {
  return makeShow((a) => (isNone(a) ? 'None' : `Some(${S.show(a.value)})`))
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverse_ :: (Applicative f, Traversable t) => Instance f -> (t a, (a -> f b)) -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[OptionURI], V> = (G) => (ta, f) =>
  isNone(ta) ? G.map_(G.unit(), () => none()) : pipe(f(ta.value), G.map(some))

/**
 * ```haskell
 * traverse :: (Applicative f, Traversable t) => Instance f -> (a -> f b) -> t a -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[OptionURI], V> = (G) => (f) => (ta) => traverse_(G)(ta, f)

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => Instance f -> t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[OptionURI], V> = (G) => (fa) =>
  isNone(fa) ? G.map_(G.unit(), () => none()) : pipe(fa.value, G.map(some))

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Option<void> {
  return some(undefined)
}

/*
 * -------------------------------------------
 * Witherable
 * -------------------------------------------
 */

export const compactA_: P.WitherFn_<[OptionURI], V> = (A) => (wa, f) =>
  isNone(wa) ? A.map_(A.unit(), () => none()) : f(wa.value)

export const compactA: P.WitherFn<[OptionURI], V> = (A) => (f) => (wa) => compactA_(A)(wa, f)

export const separateA_: P.WiltFn_<[OptionURI], V> = (A) => (wa, f) => {
  const o = map_(
    wa,
    flow(
      f,
      A.map((e) => mkTuple(getLeft(e), getRight(e)))
    )
  )
  return isNone(o) ? A.pure(mkTuple(none(), none())) : o.value
}

export const separateA: P.WiltFn<[OptionURI], V> = (A) => (f) => (wa) => separateA_(A)(wa, f)

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * bindNullableK_ :: Option m => (m a, (a -> ?b)) -> m b
 * Map over a Option with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bindNullableK_<A, B>(fa: Option<A>, f: (a: A) => B | null | undefined): Option<B> {
  return isNone(fa) ? none() : fromNullable(f(fa.value))
}

/**
 * bindNullableK :: Option m => (a -> ?b) -> m a -> m b
 * Map over a Option with a function that returns a nullable value
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bindNullableK<A, B>(f: (a: A) => B | null | undefined): (fa: Option<A>) => Option<B> {
  return (fa) => bindNullableK_(fa, f)
}

/**
 * orElse_ :: Option m => (m a, () -> m b) -> m (a | b)
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElse_<A, B>(fa: Option<A>, onNone: () => Option<B>): Option<A | B> {
  return isNone(fa) ? onNone() : fa
}

/**
 * orElse :: Option m => (() -> m b) -> m a -> m (a | b)
 * Evaluate and return alternate optional value if empty
 *
 * @category Combinators
 * @since 1.0.0
 */
export function orElse<B>(onNone: () => Option<B>): <A>(fa: Option<A>) => Option<B | A> {
  return (fa) => orElse_(fa, onNone)
}

/**
 * getLeft :: (Either e, Option m) => e a b -> m a
 * Evaluates an `Either` and returns a `Option` carrying the left value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getLeft<E, A>(fea: Either<E, A>): Option<E> {
  return fea._tag === 'Right' ? none() : some(fea.left)
}

/**
 * getRight :: (Either e, Option m) => e a b -> m b
 * Evaluates an `Either` and returns a `Option` carrying the right value, if it exists
 *
 * @category Combinators
 * @since 1.0.0
 */
export function getRight<E, A>(fea: Either<E, A>): Option<A> {
  return fea._tag === 'Left' ? none() : some(fea.right)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Functor: P.Functor<[OptionURI], V> = HKT.instance({
  invmap_: (fa, f, _) => map_(fa, f),
  invmap: <A, B>(f: (a: A) => B, _: (b: B) => A) => (fa: Option<A>) => map_(fa, f),
  map,
  map_
})

export const Alt: P.Alt<[OptionURI], V> = HKT.instance({
  ...Functor,
  alt_,
  alt
})

export const Apply: P.Apply<[OptionURI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  map2_,
  map2,
  product_,
  product
})

export const struct = P.sequenceSF(Apply)

export const tupleN = P.sequenceTF(Apply)

export const mapN = P.mapNF(Apply)

export const Applicative: P.Applicative<[OptionURI], V> = HKT.instance({
  ...Apply,
  unit,
  pure
})

export const Monad: P.Monad<[OptionURI], V> = HKT.instance({
  ...Applicative,
  bind_: bind_,
  bind: bind,
  unit,
  flatten
})

export const Do = P.deriveDo(Monad)

const of: Option<{}> = some({})
export { of as do }

/**
 * ```haskell
 * bindS :: (Monad m, Nominal n) =>
 *   (n n3, (({ n n1: a, n n2: b, ... }) -> m c))
 *   -> m ({ n n1: a, n2: b, ... })
 *   -> m ({ n n1: a, n n2: b, ..., n n3: c })
 * ```
 *
 * Contributes a computation to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const bindS = Do.bindS

/**
 * ```haskell
 * letS :: (Monad m, Nominal n) =>
 *   (n n3, (({ n1: a, n2: b, ... }) -> c))
 *   -> m ({ n1: a, n2: b, ... })
 *   -> m ({ n1: a, n2: b, ..., n3: c })
 * ```
 *
 * Contributes a pure value to a threaded scope
 *
 * @category Do
 * @since 1.0.0
 */
export const letS = Do.letS

/**
 * ```haskell
 * bindToS :: (Monad m, Nominal n) => n n1 -> m a -> m ({ n1: a })
 * ```
 *
 * Binds a computation to a property in a `Record`.
 *
 * @category Do
 * @since 1.0.0
 */
export const bindToS = Do.bindToS

export const Extend: P.Extend<[OptionURI], V> = HKT.instance({
  ...Functor,
  extend_,
  extend
})

export const Filterable: P.Filterable<[OptionURI], V> = HKT.instance({
  filterMap_,
  filter_,
  partitionMap_,
  partition_,
  filter,
  filterMap,
  partition,
  partitionMap
})

export const Foldable: P.Foldable<[OptionURI], V> = HKT.instance({
  foldl_,
  foldr_,
  foldMap_,
  foldl,
  foldr,
  foldMap
})

export const Traversable: P.Traversable<[OptionURI], V> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
})

export const Witherable: P.Witherable<[OptionURI], V> = HKT.instance({
  separateA_,
  compactA_,
  separateA,
  compactA
})
