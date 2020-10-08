import type { FunctionN, Lazy, Predicate, Refinement } from "../Function";
import type { Option } from "../Option";
import type { Either } from "./Either";

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
export const left = <E = never, A = never>(e: E): Either<E, A> => ({
   _tag: "Left",
   left: e
});

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
export const right = <E = never, A = never>(a: A): Either<E, A> => ({
   _tag: "Right",
   right: a
});

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
export const fromNullable = <E>(e: Lazy<E>) => <A>(a: A): Either<E, NonNullable<A>> =>
   a == null ? left(e()) : right(a as NonNullable<A>);

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
export const partial_ = <E, A>(a: Lazy<A>, onThrow: (reason: unknown) => E): Either<E, A> => {
   try {
      return right(a());
   } catch (e) {
      return left(onThrow(e));
   }
};

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
export const partial = <E>(onError: (reason: unknown) => E) => <A>(a: Lazy<A>): Either<E, A> => {
   try {
      return right(a());
   } catch (e) {
      return left(onError(e));
   }
};

/**
 * ```haskell
 * _partialK :: (((a, b, ...) -> c), (* -> e)) -> ((a, b, ...) -> Either e c)
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export const partialK_ = <A extends ReadonlyArray<unknown>, B, E>(
   f: FunctionN<A, B>,
   onThrow: (reason: unknown) => E
): ((...args: A) => Either<E, B>) => (...a) => partial_(() => f(...a), onThrow);

/**
 * ```haskell
 * partialK :: (* -> e) -> ((a, b, ...) -> c) -> ((a, b, ...) -> Either e c)
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export const partialK = <E>(onThrow: (reason: unknown) => E) => <A extends ReadonlyArray<unknown>, B>(
   f: FunctionN<A, B>
) => partialK_(f, onThrow);

export type Json = boolean | number | string | null | JsonArray | JsonRecord;

export interface JsonRecord extends Readonly<Record<string, Json>> {}

export interface JsonArray extends ReadonlyArray<Json> {}

/**
 * ```haskell
 * _parseJSON :: (String, (* -> e)) -> Either e Json
 * ```
 *
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @category Constructors
 * @since 1.0.0
 */
export const parseJson_ = <E>(s: string, onThrow: (reason: unknown) => E): Either<E, Json> =>
   partial_(() => JSON.parse(s), onThrow);

/**
 * ```haskell
 * parseJSON :: (* -> e) -> String -> Either e Json
 * ```
 *
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @category Constructors
 * @since 1.0.0
 */
export const parseJson = <E>(onThrow: (reason: unknown) => E) => (s: string): Either<E, Json> => parseJson_(s, onThrow);

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
export const stringifyJson_ = <E>(u: unknown, onThrow: (reason: unknown) => E): Either<E, string> =>
   partial_(() => JSON.stringify(u), onThrow);

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
export const stringifyJSON = <E>(onThrow: (reason: unknown) => E) => (u: unknown): Either<E, string> =>
   stringifyJson_(u, onThrow);

/**
 * ```haskell
 * _fromMaybe :: (Maybe a, (() -> e)) -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromOption_ = <E, A>(fa: Option<A>, onNothing: Lazy<E>): Either<E, A> =>
   fa._tag === "None" ? left(onNothing()) : right(fa.value);

/**
 * ```haskell
 * fromMaybe :: (() -> e) -> Maybe a -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromOption: <E>(onNothing: Lazy<E>) => <A>(fa: Option<A>) => Either<E, A> = (f) => (fa) =>
   fromOption_(fa, f);

/**
 * ```haskell
 * _fromPredicate :: (a, (a is b), (a -> e)) -> Either e b
 * _fromPredicate :: (a, (a -> Boolean), (a -> e)) -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate_: {
   <E, A, B extends A>(a: A, refinement: Refinement<A, B>, onFalse: (a: A) => E): Either<E, B>;
   <E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A>;
} = <E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A> =>
   predicate(a) ? right(a) : left(onFalse(a));

/**
 * ```haskell
 * fromPredicate :: ((a is b), (a -> e)) -> a -> Either e b
 * fromPredicate :: ((a -> Boolean), (a -> e)) -> a -> Either e a
 * ```
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fromPredicate: {
   <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (a: A) => Either<E, B>;
   <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>;
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (a: A) => fromPredicate_(a, predicate, onFalse);
