import type { FunctionN, Lazy, Predicate, Refinement } from "../Function";
import type { Option } from "../Option";
import type { Either } from "./model";

/*
 * -------------------------------------------
 * Either Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * left :: e -> Left e
 * ```
 *
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export function left<E = never, A = never>(e: E): Either<E, A> {
   return {
      _tag: "Left",
      left: e
   };
}

/**
 * ```haskell
 * right :: a -> Right a
 * ```
 *
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias of this structure
 *
 * @category Constructors
 * @since 1.0.0
 */
export function right<E = never, A = never>(a: A): Either<E, A> {
   return {
      _tag: "Right",
      right: a
   };
}

/**
 * 
 * ```haskell
 * fromNullable_ :: (?a, (() -> e)) -> Either e a
 * ```
 
 * Takes a default and a nullable value, if the value is not nully, turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable_<E, A>(a: A, e: Lazy<E>): Either<E, NonNullable<A>> {
   return a == null ? left(e()) : right(a as NonNullable<A>);
}

/**
 * 
 * ```haskell
 * fromNullable :: (() -> e) -> ?a -> Either e a
 * ```
 
 * Takes a default and a nullable value, if the value is not nully, turn it into a `Right`, if the value is nully use the provided default as a `Left`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromNullable<E>(e: Lazy<E>): <A>(a: A) => Either<E, NonNullable<A>> {
   return <A>(a: A): Either<E, NonNullable<A>> => (a == null ? left(e()) : right(a as NonNullable<A>));
}

export function fromNullableK_<E, A extends ReadonlyArray<unknown>, B>(
   f: (...args: A) => B | null | undefined,
   e: Lazy<E>
): (...args: A) => Either<E, NonNullable<B>> {
   const from = fromNullable(e);
   return (...args) => from(f(...args));
}

export function fromNullableK<E>(
   e: Lazy<E>
): <A extends readonly unknown[], B>(
   f: (...args: A) => B | null | undefined
) => (...args: A) => Either<E, NonNullable<B>> {
   return (f) => fromNullableK_(f, e);
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
export function partial_<E, A>(a: Lazy<A>, onThrow: (reason: unknown) => E): Either<E, A> {
   try {
      return right(a());
   } catch (e) {
      return left(onThrow(e));
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
export function partial<E>(onError: (reason: unknown) => E): <A>(a: Lazy<A>) => Either<E, A> {
   return (a) => {
      try {
         return right(a());
      } catch (e) {
         return left(onError(e));
      }
   };
}

/**
 * ```haskell
 * _partialK :: (((a, b, ...) -> c), (* -> e)) -> ((a, b, ...) -> Either e c)
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partialK_<A extends ReadonlyArray<unknown>, B, E>(
   f: FunctionN<A, B>,
   onThrow: (reason: unknown) => E
): (...args: A) => Either<E, B> {
   return (...a) => partial_(() => f(...a), onThrow);
}

/**
 * ```haskell
 * partialK :: (* -> e) -> ((a, b, ...) -> c) -> ((a, b, ...) -> Either e c)
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function partialK<E>(
   onThrow: (reason: unknown) => E
): <A extends ReadonlyArray<unknown>, B>(f: FunctionN<A, B>) => (...args: A) => Either<E, B> {
   return (f) => partialK_(f, onThrow);
}

export type Json = boolean | number | string | null | JsonArray | JsonRecord;

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
   return partial_(() => JSON.parse(s), onThrow);
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
   return (s) => parseJson_(s, onThrow);
}

/**
 * ```haskell
 * _stringifyJSON :: (*, (* -> E)) -> Either e String
 * ```
 *
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function stringifyJson_<E>(u: unknown, onThrow: (reason: unknown) => E): Either<E, string> {
   return partial_(() => JSON.stringify(u), onThrow);
}

/**
 * ```haskell
 * stringifyJSON :: (* -> E) -> * -> Either e String
 * ```
 *
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @category Constructors
 * @since 1.0.0
 */
export function stringifyJson<E>(onThrow: (reason: unknown) => E): (u: unknown) => Either<E, string> {
   return (u) => stringifyJson_(u, onThrow);
}

/**
 * ```haskell
 * _fromOption :: (Option a, (() -> e)) -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromOption_<E, A>(fa: Option<A>, onNothing: Lazy<E>): Either<E, A> {
   return fa._tag === "None" ? left(onNothing()) : right(fa.value);
}

/**
 * ```haskell
 * fromOption :: (() -> e) -> Option a -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromOption<E>(onNothing: Lazy<E>): <A>(fa: Option<A>) => Either<E, A> {
   return (fa) => fromOption_(fa, onNothing);
}

/**
 * ```haskell
 * _fromPredicate :: (a, (a is b), (a -> e)) -> Either e b
 * _fromPredicate :: (a, (a -> Boolean), (a -> e)) -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromPredicate_<E, A, B extends A>(
   a: A,
   refinement: Refinement<A, B>,
   onFalse: (a: A) => E
): Either<E, B>;
export function fromPredicate_<E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A>;
export function fromPredicate_<E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A> {
   return predicate(a) ? right(a) : left(onFalse(a));
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
): (a: A) => Either<E, B>;
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>;
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A> {
   return (a) => fromPredicate_(a, predicate, onFalse);
}
