/**
 * Everybody's favorite sum type
 *
 * Either represents values with two possibilities: Left<E> or Right<A>
 * By convention, the _Left_ constructor is used to hold an Error value
 * and the _Right_ constructor is used to hold a correct value
 */

import type { Eq } from './Eq/core'
import type { MorphismN, Predicate, Refinement } from './Function'
import type { Option } from './Option'
import type { Show } from './Show'

import { genF, GenHKT } from './Derivation/genF'
import { _bind, flow, identity, pipe, tuple as mkTuple } from './Function'
import * as HKT from './HKT'
import * as O from './Option'
import * as P from './typeclass'
import { NoSuchElementException } from './util/GlobalExceptions'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Left<E> {
  readonly _tag: 'Left'
  readonly left: E
}

export interface Right<A> {
  readonly _tag: 'Right'
  readonly right: A
}

export type Either<E, A> = Left<E> | Right<A>

export type InferLeft<T extends Either<any, any>> = T extends Left<infer E> ? E : never

export type InferRight<T extends Either<any, any>> = T extends Right<infer A> ? A : never

export const URI = 'Either'

export type URI = typeof URI

export type V = HKT.V<'E', '+'>

declare module './HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Either<E, A>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * left :: e -> Left e
 * ```
 *
 * Constructs a new `Either` holding a `Left` value.
 * This usually represents a failure, due to the right-bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export function left<E = never, A = never>(e: E): Either<E, A> {
  return {
    _tag: 'Left',
    left: e
  }
}

/**
 * ```haskell
 * right :: a -> Right a
 * ```
 *
 * Constructs a new `Either` holding a `Right` value.
 * This usually represents a successful value due to the right bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export function right<E = never, A = never>(a: A): Either<E, A> {
  return {
    _tag: 'Right',
    right: a
  }
}

/**
 *
 * ```haskell
 * fromNullable_ :: (?a, (() -> e)) -> Either e a
 * ```
 *
 * Takes a default and a nullable value, if the value is not nully,
 * turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable_<E, A>(a: A, e: () => E): Either<E, NonNullable<A>> {
  return a == null ? left(e()) : right(a as NonNullable<A>)
}

/**
 *
 * ```haskell
 * fromNullable :: (() -> e) -> ?a -> Either e a
 * ```
 *
 * Takes a default and a nullable value, if the value is not nully,
 * turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable<E>(e: () => E): <A>(a: A) => Either<E, NonNullable<A>> {
  return <A>(a: A): Either<E, NonNullable<A>> => (a == null ? left(e()) : right(a as NonNullable<A>))
}

export function fromNullableK_<E, A extends ReadonlyArray<unknown>, B>(
  f: (...args: A) => B | null | undefined,
  e: () => E
): (...args: A) => Either<E, NonNullable<B>> {
  const from = fromNullable(e)
  return (...args) => from(f(...args))
}

export function fromNullableK<E>(
  e: () => E
): <A extends readonly unknown[], B>(
  f: (...args: A) => B | null | undefined
) => (...args: A) => Either<E, NonNullable<B>> {
  return (f) => fromNullableK_(f, e)
}

/**
 * ```haskell
 * _partial :: (() -> a, (* -> e)) -> Either e a
 * ```
 *
 * Constructs a new `Either` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatch_<E, A>(thunk: () => A, onThrow: (reason: unknown) => E): Either<E, A> {
  try {
    return right(thunk())
  } catch (e) {
    return left(onThrow(e))
  }
}

/**
 * ```haskell
 * partial :: (* -> e) -> (() -> a) -> Either e a
 * ```
 *
 * Constructs a new `Either` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatch<E>(onError: (reason: unknown) => E): <A>(thunk: () => A) => Either<E, A> {
  return (a) => {
    try {
      return right(a())
    } catch (e) {
      return left(onError(e))
    }
  }
}

/**
 * ```haskell
 * tryCatchK_ :: (((a, b, ...) -> c), (* -> e)) -> ((a, b, ...) -> Either e c)
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK_<A extends ReadonlyArray<unknown>, B, E>(
  f: MorphismN<A, B>,
  onThrow: (reason: unknown) => E
): (...args: A) => Either<E, B> {
  return (...a) => tryCatch_(() => f(...a), onThrow)
}

/**
 * ```haskell
 * tryCatchK :: (* -> e) -> ((a, b, ...) -> c) -> ((a, b, ...) -> Either e c)
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function tryCatchK<E>(
  onThrow: (reason: unknown) => E
): <A extends ReadonlyArray<unknown>, B>(f: MorphismN<A, B>) => (...args: A) => Either<E, B> {
  return (f) => tryCatchK_(f, onThrow)
}

export type Json = boolean | number | string | null | JsonArray | JsonRecord

export interface JsonRecord extends Readonly<Record<string, Json>> {}

export interface JsonArray extends ReadonlyArray<Json> {}

/**
 * ```haskell
 * _parseJson :: (String, (* -> e)) -> Either e Json
 * ```
 *
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function parseJson_<E>(s: string, onThrow: (reason: unknown) => E): Either<E, Json> {
  return tryCatch_(() => JSON.parse(s), onThrow)
}

/**
 * ```haskell
 * parseJson :: (* -> e) -> String -> Either e Json
 * ```
 *
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function parseJson<E>(onThrow: (reason: unknown) => E): (s: string) => Either<E, Json> {
  return (s) => parseJson_(s, onThrow)
}

/**
 * ```haskell
 * stringifyJson_ :: (*, (* -> E)) -> Either e String
 * ```
 *
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function stringifyJson_<E>(u: unknown, onThrow: (reason: unknown) => E): Either<E, string> {
  return tryCatch_(() => JSON.stringify(u), onThrow)
}

/**
 * ```haskell
 * stringifyJson :: (* -> E) -> * -> Either e String
 * ```
 *
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function stringifyJson<E>(onThrow: (reason: unknown) => E): (u: unknown) => Either<E, string> {
  return (u) => stringifyJson_(u, onThrow)
}

/**
 * ```haskell
 * fromOption_ :: (Option a, (() -> e)) -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromOption_<E, A>(fa: Option<A>, onNothing: () => E): Either<E, A> {
  return fa._tag === 'None' ? left(onNothing()) : right(fa.value)
}

/**
 * ```haskell
 * fromOption :: (() -> e) -> Option a -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromOption<E>(onNothing: () => E): <A>(fa: Option<A>) => Either<E, A> {
  return (fa) => fromOption_(fa, onNothing)
}

/**
 * ```haskell
 * fromPredicate_ :: (a, (a is b), (a -> e)) -> Either e b
 * fromPredicate_ :: (a, (a -> Boolean), (a -> e)) -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate_<E, A, B extends A>(
  a: A,
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): Either<E, B>
export function fromPredicate_<E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A>
export function fromPredicate_<E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A> {
  return predicate(a) ? right(a) : left(onFalse(a))
}

/**
 * ```haskell
 * fromPredicate :: ((a is b), (a -> e)) -> a -> Either e b
 * fromPredicate :: ((a -> Boolean), (a -> e)) -> a -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate<E, A, B extends A>(
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): (a: A) => Either<E, B>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A> {
  return (a) => fromPredicate_(a, predicate, onFalse)
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

/**
 * ```haskell
 * isLeft :: Either e a -> is Left e
 * ```
 *
 * Returns `true` if the either is an instance of `Left`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isLeft<E, A>(fa: Either<E, A>): fa is Left<E> {
  return fa._tag === 'Left'
}

/**
 * ```haskell
 * isRight :: Either e a -> is Right a
 * ```
 *
 * Returns `true` if the either is an instance of `Right`, `false` otherwise
 *
 * @category Guards
 * @since 1.0.0
 */
export function isRight<E, A>(fa: Either<E, A>): fa is Right<A> {
  return fa._tag === 'Right'
}

export function isEither(u: unknown): u is Either<unknown, unknown> {
  return typeof u === 'object' && u != null && '_tag' in u && (u['_tag'] === 'Left' || u['_tag'] === 'Right')
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * fold_ :: (Either e a, (e -> b), (a -> c)) -> b | c
 * ```
 *
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold_<E, A, B, C>(pab: Either<E, A>, onLeft: (e: E) => B, onRight: (a: A) => C): B | C {
  return isLeft(pab) ? onLeft(pab.left) : onRight(pab.right)
}

/**
 * ```haskell
 * fold :: ((e -> b), (a -> c)) -> Either e a -> b | c
 * ```
 *
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold<E, A, B, C>(onLeft: (e: E) => B, onRight: (a: A) => C): (pab: Either<E, A>) => B | C {
  return (pab) => fold_(pab, onLeft, onRight)
}

/**
 * ```haskell
 * getOrElse_ :: (Either e a, (e -> b)) -> a | b
 * ```
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse_<E, A, B>(pab: Either<E, A>, onLeft: (e: E) => B): A | B {
  return isLeft(pab) ? onLeft(pab.left) : pab.right
}

/**
 * ```haskell
 * getOrElse :: (e -> b) -> Either e a -> a | b
 * ```
 *
 * @category Destructors
 * @since 1.0.0
 */
export function getOrElse<E, A, B>(f: (e: E) => B): (pab: Either<E, A>) => A | B {
  return (pab) => getOrElse_(pab, f)
}

/**
 * ```haskell
 * merge :: Either e a -> e | a
 * ```
 *
 * @category Destructors
 * @since 1.0.0
 */
export function merge<E, A>(pab: Either<E, A>): E | A {
  return fold_(pab, identity, identity as any)
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
 * Identifies an associative operation on a type constructor.
 * It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E, A, G>(fa: Either<E, A>, that: () => Either<G, A>): Either<E | G, A> {
  return isLeft(fa) ? that() : fa
}

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Identifies an associative operation on a type constructor.
 * It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<G, A>(that: () => Either<G, A>): <E>(fa: Either<E, A>) => Either<G | E, A> {
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
 * Lifts a pure expression info an `Either`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <E = never, A = never>(a: A) => Either<E, A> = right

/*
 * -------------------------------------------
 * ApplicativeExcept
 * -------------------------------------------
 */

export function catchAll_<E, A, E1, B>(fa: Either<E, A>, f: (e: E) => Either<E1, B>): Either<E1, A | B> {
  return fold_(fa, f, right)
}

export function catchAll<E, E1, B>(f: (e: E) => Either<E1, B>): <A>(fa: Either<E, A>) => Either<E1, A | B> {
  return (fa) => catchAll_(fa, f)
}

export function catchSome_<E, A, E1, B>(fa: Either<E, A>, f: (e: E) => Option<Either<E1, B>>): Either<E | E1, A | B> {
  return catchAll_(
    fa,
    flow(
      f,
      O.getOrElse((): Either<E | E1, A | B> => fa)
    )
  )
}

export function catchSome<E, E1, B>(
  f: (e: E) => Option<Either<E1, B>>
): <A>(fa: Either<E, A>) => Either<E | E1, A | B> {
  return (fa) => catchSome_(fa, f)
}

export function catchMap_<E, A, B>(fa: Either<E, A>, f: (e: E) => B): Either<never, A | B> {
  return catchAll_(fa, flow(f, right))
}

export function catchMap<E, B>(f: (e: E) => B): <A>(fa: Either<E, A>) => Either<never, A | B> {
  return (fa) => catchMap_(fa, f)
}

export function attempt<E, A>(fa: Either<E, A>): Either<never, Either<E, A>> {
  return right(fa)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

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
export function ap_<E, A, G, B>(fab: Either<G, (a: A) => B>, fa: Either<E, A>): Either<E | G, B> {
  return isLeft(fab) ? fab : isLeft(fa) ? fa : right(fab.right(fa.right))
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
export function ap<E, A>(fa: Either<E, A>): <G, B>(fab: Either<G, (a: A) => B>) => Either<E | G, B> {
  return (fab) => ap_(fab, fa)
}

/**
 * ```haskell
 * apl_ :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apl_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

/**
 * ```haskell
 * apl :: Apply f => f b -> f a -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export function apl<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, A> {
  return (fa) => apl_(fa, fb)
}

/**
 * ```haskell
 * apr_ :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apr_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
}

/**
 * ```haskell
 * apr :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apr<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, B> {
  return (fa) => apr_(fa, fb)
}

/**
 * ```haskell
 * product_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Either`s and if both are `Right`,
 * collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function product_<E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, readonly [A, B]> {
  return map2_(fa, fb, mkTuple)
}

/**
 * ```haskell
 * product :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `Either`s and if both are `Right`,
 * collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function product<G, B>(fb: Either<G, B>): <E, A>(fa: Either<E, A>) => Either<G | E, readonly [A, B]> {
  return (fa) => product_(fa, fb)
}

/**
 * ```haskell
 * map2_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Either`s and if both are `Right`,
 * maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function map2_<E, A, G, B, C>(fa: Either<E, A>, fb: Either<G, B>, f: (a: A, b: B) => C): Either<E | G, C> {
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
 * Applies both `Either`s and if both are `Right`,
 * maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export function map2<A, G, B, C>(fb: Either<G, B>, f: (a: A, b: B) => C): <E>(fa: Either<E, A>) => Either<G | E, C> {
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
export function liftA2<A, B, C>(
  f: (a: A) => (b: B) => C
): <E>(fa: Either<E, A>) => <G>(fb: Either<G, B>) => Either<E | G, C> {
  return (fa) => (fb) => (isLeft(fa) ? left(fa.left) : isLeft(fb) ? left(fb.left) : right(f(fa.right)(fb.right)))
}

/**
 * ```haskell
 * apS :: (Apply f, Nominal n) =>
 *    (n n3, f c)
 *    -> f ({ n1: a, n2: b, ... })
 *    -> f ({ n1: a, n2: b, n3: c })
 * ```
 *
 * A pipeable version of `struct`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apS<N extends string, A, E1, B>(
  name: Exclude<N, keyof A>,
  fb: Either<E1, B>
): <E>(
  fa: Either<E, A>
) => Either<
  E | E1,
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
 * Bifunctor
 * -------------------------------------------
 */

/**
 * ```haskell
 * swap :: Bifunctor p => p a b -> p b a
 * ```
 *
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function swap<E, A>(pab: Either<E, A>): Either<A, E> {
  return isLeft(pab) ? right(pab.left) : left(pab.right)
}

/**
 * ```haskell
 * bimap_ :: Bifunctor p => (p a b, (a -> c), (b -> d)) -> p c d
 * ```
 *
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap_<E, A, G, B>(pab: Either<E, A>, f: (e: E) => G, g: (a: A) => B): Either<G, B> {
  return isLeft(pab) ? left(f(pab.left)) : right(g(pab.right))
}

/**
 * ```haskell
 * bimap :: Bifunctor p => ((a -> c), (b -> d)) -> p a b -> p c d
 * ```
 *
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: Either<E, A>) => Either<G, B> {
  return (pab) => bimap_(pab, f, g)
}

/**
 * ```haskell
 * mapLeft_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapLeft_<E, A, G>(pab: Either<E, A>, f: (e: E) => G): Either<G, A> {
  return isLeft(pab) ? left(f(pab.left)) : pab
}

/**
 * ```haskell
 * mapLeft :: Bifunctor p => (a -> c) -> p a b -> p c b
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapLeft<E, G>(f: (e: E) => G): <A>(pab: Either<E, A>) => Either<G, A> {
  return (pab) => mapLeft_(pab, f)
}

/*
 * -------------------------------------------
 * Compactable
 * -------------------------------------------
 */

export function getCompactable<E>(M: P.Monoid<E>) {
  return HKT.instance<P.Compactable<[URI], V & HKT.Fix<'E', E>>>({
    compact: (fa) => {
      return isLeft(fa) ? fa : fa.right._tag === 'None' ? left(M.nat) : right(fa.right.value)
    },

    separate: (fa) => {
      return isLeft(fa)
        ? [fa, fa]
        : isLeft(fa.right)
        ? [right(fa.right.left), left(M.nat)]
        : [left(M.nat), right(fa.right.right)]
    }
  })
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

/**
 * ```haskell
 * getEq :: (Eq e, Eq a) -> Eq (Either a e)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export function getEq<E, A>(eqE: Eq<E>, eqA: Eq<A>): Eq<Either<E, A>> {
  const equals_ = (x: Either<E, A>, y: Either<E, A>) =>
    x === y || (isLeft(x) ? isLeft(y) && eqE.equals_(x.left, y.left) : isRight(y) && eqA.equals_(x.right, y.right))
  return {
    equals_,
    equals: (y) => (x) => equals_(x, y)
  }
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
 *
 * @category Extend
 * @since 1.0.0
 */
export function extend_<E, A, B>(wa: Either<E, A>, f: (wa: Either<E, A>) => B): Either<E, B> {
  return isLeft(wa) ? wa : right(f(wa))
}

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export function extend<E, A, B>(f: (wa: Either<E, A>) => B): (wa: Either<E, A>) => Either<E, B> {
  return (wa) => extend_(wa, f)
}

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export function duplicate<E, A>(wa: Either<E, A>): Either<E, Either<E, A>> {
  return extend_(wa, identity)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

/**
 * ```haskell
 * getFilterable :: Monoid e -> Filterable (Either e _)
 * ```
 *
 * Builds a `Filterable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export function getFilterable<E>(M: P.Monoid<E>): P.Filterable<[URI], V & HKT.Fix<'E', E>> {
  type V_ = V & HKT.Fix<'E', E>

  const empty = left(M.nat)

  const partitionMap_: P.PartitionMapFn_<[URI], V_> = (fa, f) => {
    if (isLeft(fa)) {
      return [fa, fa]
    }
    const e = f(fa.right)
    return isLeft(e) ? [right(e.left), empty] : [empty, right(e.right)]
  }

  const partition_: P.PartitionFn_<[URI], V_> = <A>(
    fa: Either<E, A>,
    predicate: Predicate<A>
  ): readonly [Either<E, A>, Either<E, A>] => {
    return isLeft(fa) ? [fa, fa] : predicate(fa.right) ? [empty, right(fa.right)] : [right(fa.right), empty]
  }

  const filterMap_: P.FilterMapFn_<[URI], V_> = (fa, f) => {
    if (isLeft(fa)) {
      return fa
    }
    const ob = f(fa.right)
    return ob._tag === 'None' ? empty : right(ob.value)
  }

  const filter_: P.FilterFn_<[URI], V_> = <A>(fa: Either<E, A>, predicate: Predicate<A>): Either<E, A> =>
    isLeft(fa) ? fa : predicate(fa.right) ? fa : empty

  return HKT.instance<P.Filterable<[URI], V_>>({
    ...Functor,
    filter_: filter_,
    filterMap_,
    partition_: partition_,
    partitionMap_,
    filter: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => filter_(fa, predicate),
    filterMap: (f) => (fa) => filterMap_(fa, f),
    partition: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => partition_(fa, predicate),
    partitionMap: (f) => (fa) => partitionMap_(fa, f)
  })
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

/**
 * ```haskell
 * foldl_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export function foldl_<E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B): B {
  return isLeft(fa) ? b : f(b, fa.right)
}

/**
 * ```haskell
 * foldl :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: Either<E, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

/**
 * ```haskell
 * foldMap_ :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: Either<E, A>, f: (a: A) => M) => M {
  return (fa, f) => (isLeft(fa) ? M.nat : f(fa.right))
}

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: Either<E, A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/**
 * ```haskell
 * foldr_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export function foldr_<E, A, B>(fa: Either<E, A>, b: B, f: (a: A, b: B) => B): B {
  return isLeft(fa) ? b : f(fa.right, b)
}

/**
 * ```haskell
 * foldr :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: Either<E, A>) => B {
  return (fa) => foldr_(fa, b, f)
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
export function map_<E, A, B>(fa: Either<E, A>, f: (a: A) => B): Either<E, B> {
  return isLeft(fa) ? fa : right(f(fa.right))
}

/**
 * ```haskell
 * map :: functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): <E>(fa: Either<E, A>) => Either<E, B> {
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
 * @category Monad
 * @since 1.0.0
 */
export function bind_<E, A, G, B>(fa: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, B> {
  return isLeft(fa) ? fa : f(fa.right)
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
export function bind<A, G, B>(f: (e: A) => Either<G, B>): <E>(ma: Either<E, A>) => Either<G | E, B> {
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
export function tap_<E, A, G, B>(ma: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, A> {
  return bind_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )
}

/**
 * ```haskell
 * tap :: Monad m => (a -> mb) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap<A, G, B>(f: (a: A) => Either<G, B>): <E>(ma: Either<E, A>) => Either<G | E, A> {
  return (ma) => tap_(ma, f)
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Either`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<E, G, A>(mma: Either<E, Either<G, A>>): Either<E | G, A> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * MonadExcept
 * -------------------------------------------
 */

export function absolve<E, E1, A>(mma: Either<E, Either<E1, A>>): Either<E | E1, A> {
  return flatten(mma)
}

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplyMonoid<E, A>(M: P.Monoid<A>): P.Monoid<Either<E, A>> {
  return {
    ...getApplySemigroup<E, A>(M),
    nat: right(M.nat)
  }
}

/*
 * -------------------------------------------
 * Semigroup
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> {
  const combine_: P.CombineFn_<Either<E, A>> = (x, y) =>
    isLeft(y) ? x : isLeft(x) ? y : right(S.combine_(x.right, y.right))
  return {
    combine_,
    combine: (y) => (x) => combine_(x, y)
  }
}

/**
 * ```haskell
 * getApplySemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values
 * are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export function getApplySemigroup<E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> {
  const combine_ = (x: Either<E, A>, y: Either<E, A>) =>
    isLeft(y) ? y : isLeft(x) ? x : right(S.combine_(x.right, y.right))
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

/**
 * ```haskell
 * getShow :: (Show e, Show a) -> Show (Either e a)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export function getShow<E, A>(showE: Show<E>, showA: Show<A>): Show<Either<E, A>> {
  return {
    show: (fa) => (isLeft(fa) ? `left(${showE.show(fa.left)})` : `right(${showA.show(fa.right)})`)
  }
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

/**
 * ```haskell
 * traverse_ :: (Applicative f, Traversable t) => (t a, (a -> f b)) -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[URI], V> = P.implementTraverse_<[URI], V>()((_) => (F) => {
  return (ta, f) =>
    isLeft(ta)
      ? F.pure(left(ta.left))
      : pipe(
          f(ta.right),
          F.map((b) => right(b))
        )
})

/**
 * ```haskell
 * traverse :: (Applicative f, Traversable t) => (a -> f b) -> t a -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[URI], V> = (F) => (f) => (ta) => traverse_(F)(ta, f)

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
export const sequence: P.SequenceFn<[URI], V> = (F) => (ta) => traverse_(F)(ta, identity)

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

/**
 * ```haskell
 * unit :: () -> Either _ ()
 * ```
 */
export function unit<E = never>(): Either<E, void> {
  return right(undefined)
}

/*
 * -------------------------------------------
 * Witherable
 * -------------------------------------------
 */

/**
 * ```haskell
 * getWitherable :: Monoid e -> Witherable (Either e _)
 * ```
 *
 * Builds a `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export function getWitherable<E>(M: P.Monoid<E>): P.Witherable<[URI], V & HKT.Fix<'E', E>> {
  type V_ = V & HKT.Fix<'E', E>

  const Compactable = getCompactable(M)

  const compactA_: P.WitherFn_<[URI], V_> = (G) => (wa, f) => {
    const traverseF = traverse_(G)
    return pipe(traverseF(wa, f), G.map(Compactable.compact))
  }

  const separateA_: P.WiltFn_<[URI], V_> = (G) => (wa, f) => {
    const traverseF = traverse_(G)
    return pipe(traverseF(wa, f), G.map(Compactable.separate))
  }

  return HKT.instance<P.Witherable<[URI], V_>>({
    compactA_: compactA_,
    separateA_: separateA_,
    compactA: (G) => (f) => (wa) => compactA_(G)(wa, f),
    separateA: (G) => (f) => (wa) => separateA_(G)(wa, f)
  })
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
  invmap_: (fa, f, _) => map_(fa, f),
  invmap: <A, B>(f: (a: A) => B, _: (b: B) => A) => <E>(fa: Either<E, A>) => map_(fa, f),
  map,
  map_
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
  ...Functor,
  bimap_,
  bimap,
  mapLeft_,
  mapLeft
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: P.Alt<[URI], V> = HKT.instance({
  ...Functor,
  alt_,
  alt
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Apply: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap,
  ap_,
  map2: map2,
  map2_: map2_,
  product_: product_,
  product: product
})

export const sequenceT = P.sequenceTF(Apply)

export const mapN = P.mapNF(Apply)

export const mapN_ = P.mapNF_(Apply)

export const sequenceS = P.sequenceSF(Apply)

/**
 * @category Instances
 * @since 1.0.0
 */
export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Apply,
  unit,
  pure
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Fail: P.Fail<[URI], V> = HKT.instance({
  fail: left
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Applicative,
  bind_,
  bind,
  flatten
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const ApplicativeExcept = HKT.instance<P.ApplicativeExcept<[URI], V>>({
  ...Applicative,
  ...Fail,
  catchAll_,
  catchAll,
  catchSome_,
  catchSome,
  attempt
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonadExcept: P.MonadExcept<[URI], V> = HKT.instance({
  ...Monad,
  ...ApplicativeExcept,
  absolve: flatten
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Foldable: P.Foldable<[URI], V> = HKT.instance({
  foldl_,
  foldMap_,
  foldr_,
  foldl,
  foldMap,
  foldr
})

/**
 * @category Instances
 * @since 1.0.0
 */
export const Traversable: P.Traversable<[URI], V> = HKT.instance({
  ...Functor,
  ...Foldable,
  traverse_,
  sequence,
  traverse
})

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

/**
 * @category Do
 * @since 1.0.0
 */
export const Do = P.deriveDo(Monad)

/**
 * ```haskell
 * do :: Either _ {}
 * ```
 *
 * @category Do
 * @since 1.0.0
 */
const of: Either<never, {}> = right({})
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

/*
 * -------------------------------------------
 * Validation
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getApplicativeValidation<E>(S: P.Semigroup<E>): P.Applicative<[URI], V & HKT.Fix<'E', E>> {
  type V_ = V & HKT.Fix<'E', E>

  const map2V_: P.Map2Fn_<[URI], V_> = (fa, fb, f) =>
    isLeft(fa) ? (isLeft(fb) ? left(S.combine_(fa.left, fb.left)) : fa) : isLeft(fb) ? fb : right(f(fa.right, fb.right))

  const productV_: P.ProductFn_<[URI], V_> = (fa, fb) => map2V_(fa, fb, mkTuple)

  const apV_: P.ApFn_<[URI], V_> = (fab, fa) =>
    isLeft(fab)
      ? isLeft(fa)
        ? left(S.combine_(fab.left, fa.left))
        : fab
      : isLeft(fa)
      ? fa
      : right(fab.right(fa.right))

  return HKT.instance<P.Applicative<[URI], V_>>({
    ...Functor,
    ap_: apV_,
    ap: (fa) => (fab) => apV_(fab, fa),
    product_: productV_,
    product: (fb) => (fa) => productV_(fa, fb),
    map2_: map2V_,
    map2: (fb, f) => (fa) => map2V_(fa, fb, f),
    pure,
    unit
  })
}

/**
 * @category Instances
 * @since 1.0.0
 */
export function getAltValidation<E>(S: P.Semigroup<E>): P.Alt<[URI], V & HKT.Fix<'E', E>> {
  type V_ = V & HKT.Fix<'E', E>

  const altV_: P.AltFn_<[URI], V_> = (fa, that) => {
    if (isRight(fa)) {
      return fa
    }
    const ea = that()
    return isLeft(ea) ? left(S.combine_(fa.left, ea.left)) : ea
  }

  return HKT.instance<P.Alt<[URI], V_>>({
    ...Functor,
    alt_: altV_,
    alt: (that) => (fa) => altV_(fa, that)
  })
}

/*
 * -------------------------------------------
 * Gen
 * -------------------------------------------
 */

const adapter: {
  <E, A>(_: Option<A>, onNone: () => E): GenHKT<Either<E, A>, A>
  <A>(_: Option<A>): GenHKT<Either<NoSuchElementException, A>, A>
  <E, A>(_: Either<E, A>): GenHKT<Either<E, A>, A>
} = (_: any, __?: any) => {
  if (O.isOption(_)) {
    return new GenHKT(fromOption_(_, () => (__ ? __() : new NoSuchElementException('Either.gen'))))
  }
  return new GenHKT(_)
}

export const gen = genF(Monad, { adapter })

/*
 * -------------------------------------------
 * Util
 * -------------------------------------------
 */

/**
 * Compact type Either<E, A> | Either<E1, B> to Either<E | E1, A | B>
 */
export const deunion: <T extends Either<any, any>>(
  fa: T
) => [T] extends [Either<infer E, infer A>] ? Either<E, A> : T = identity as any

export function widenE<E1>(): <E, A>(fa: Either<E, A>) => Either<E1 | E, A> {
  return identity
}

export function widenA<A1>(): <E, A>(fa: Either<E, A>) => Either<E, A1 | A> {
  return identity
}
