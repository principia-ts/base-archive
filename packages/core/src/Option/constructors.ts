import type { Either } from "../Either";
import type { FunctionN, Lazy, Predicate, Refinement } from "../Function";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * nothing :: <a> () -> Nothing
 * ```
 *
 * Constructs a new `Option` holding no value (a.k.a `Nothing`)
 *
 * @category Constructors
 * @since 1.0.0
 */
export function none<A = never>(): Option<A> {
   return {
      _tag: "None"
   };
}

/**
 * ```haskell
 * just :: a -> Just a
 * ```
 *
 * Constructs a new `Option` holding a `Just` value.
 *
 * @category Constructs
 * @since 1.0.0
 */
export function some<A>(a: A): Option<A> {
   return {
      _tag: "Some",
      value: a
   };
}

/**
 * ```haskell
 * fromNullable :: ?a -> Option a
 * ```
 *
 * Constructs a new `Option` from a nullable value. If the value is `null` or `undefined`, returns `Nothing`, otherwise
 * returns the value wrapped in a `Just`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable<A>(a: A | null | undefined): Option<NonNullable<A>> {
   return a == null ? none() : some(a as NonNullable<A>);
}

export function fromNullableK<A extends ReadonlyArray<unknown>, B>(
   f: (...args: A) => B | null | undefined
): (...args: A) => Option<NonNullable<B>> {
   return (...args) => fromNullable(f(...args));
}

/**
 * ```haskell
 * partial :: (() -> a) -> Option a
 * ```
 *
 * Constructs a new `Option` from a function that might throw
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partial<A>(thunk: Lazy<A>): Option<A> {
   try {
      return some(thunk());
   } catch (_) {
      return none();
   }
}

/**
 * ```haskell
 * partialK :: ((a, b, ...) -> c) -> ((a, b, ...) -> Option c)
 * ```
 *
 * Transforms a non-curried function that may throw, takes a set of arguments `(a, b, ...)`, and returns a value `c`, into a non-curried function that will not throw, takes a set of arguments `(a, b, ...)`, and returns a `Option`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partialK<A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, B>): (...args: A) => Option<B> {
   return (...a) => partial(() => f(...a));
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
export function fromPredicate_<A, B extends A>(a: A, refinement: Refinement<A, B>): Option<A>;
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A>;
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A> {
   return predicate(a) ? none() : some(a);
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
export function fromPredicate<A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<A>;
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A>;
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A> {
   return (a) => fromPredicate_(a, predicate);
}

/**
 * ```haskell
 * fromEither :: Either e a -> Option a
 * ```
 *
 * Constructs a new `Option` from an `Either`, transforming a `Left` into a `Nothing` and a `Right` into a `Just`.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromEither<E, A>(ma: Either<E, A>): Option<A> {
   return ma._tag === "Left" ? none() : some(ma.right);
}
