import { Eq } from "../Eq";
import { Predicate, Refinement } from "../Function";
import { left, right } from "./constructors";
import type { Either } from "./Either";
import { isLeft } from "./guards";
import { _map } from "./methods";

/*
 * -------------------------------------------
 * Either Combinators
 * -------------------------------------------
 */

/**
 * _orElse :: Either E => (E a b, (a -> b)) -> a | b
 */
export const _orElse = <E, E1, A, B>(
   fa: Either<E, A>,
   onLeft: (e: E) => Either<E1, B>
): Either<E1, A | B> => (isLeft(fa) ? onLeft(fa.left) : fa);

/**
 * orElse :: Either E => (a -> b) -> E a b -> a | b
 */
export const orElse: <E, E1, A, B>(
   onLeft: (e: E) => Either<E1, B>
) => (fa: Either<E, A | B>) => Either<E1, A | B> = (f) => (fa) => _orElse(fa, f);

/**
 * _orElseEither :: Either E => (E a b, (a -> E c a)) -> E c (E a b)
 */
export const _orElseEither = <E, A, E1, B>(
   fa: Either<E, A>,
   onLeft: (e: E) => Either<E1, B>
): Either<E1, Either<A, B>> => _orElse(_map(fa, left), (e) => _map(onLeft(e), right));

/**
 * orElseEither :: Either E => (a -> E c a) -> E a b -> E c (E a b)
 */
export const orElseEither: <E, E1, B>(
   onLeft: (e: E) => Either<E1, B>
) => <A>(fa: Either<E, A>) => Either<E1, Either<A, B>> = (f) => (fa) => _orElseEither(fa, f);

/**
 * _filterOrElse :: (Either E, Bool B) => (E a b, (a -> B), (a -> c)) -> E (a | c) b
 */
export const _filterOrElse: {
   <E, E1, A, B extends A>(
      fa: Either<E1, A>,
      refinement: Refinement<A, B>,
      onFalse: (a: A) => E
   ): Either<E | E1, B>;
   <E, E1, A>(fa: Either<E1, A>, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E | E1, A>;
} = <E, E1, A>(fa: Either<E1, A>, predicate: Predicate<A>, onFalse: (a: A) => E) =>
   isLeft(fa) ? fa : predicate(fa.right) ? right(fa.right) : left(onFalse(fa.right));

/**
 * filterOrElse :: (Either E, Bool B) => ((a -> B), (a -> c)) -> E a b -> E (a | c) b
 */
export const filterOrElse: {
   <E, E1, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
      fa: Either<E1, A>
   ) => Either<E | E1, B>;
   <E, E1, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (
      fa: Either<E1, A>
   ) => Either<E | E1, A>;
} = <E, E1, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (fa: Either<E1, A>) =>
   _filterOrElse(fa, predicate, onFalse);

export const elem = <A>(E: Eq<A>) => <E>(a: A, fa: Either<E, A>): boolean =>
   isLeft(fa) ? false : E.equals(a)(fa.right);

export const _exists: {
   <E, A, B extends A>(fa: Either<E, A>, refinement: Refinement<A, B>): fa is Either<E, B>;
   <E, A>(fa: Either<E, A>, predicate: Predicate<A>): fa is Either<E, A>;
} = <E, A>(fa: Either<E, A>, predicate: Predicate<A>): fa is Either<E, A> =>
   isLeft(fa) ? false : predicate(fa.right);

export const exists: {
   <A, B extends A>(refinement: Refinement<A, B>): <E>(fa: Either<E, A>) => fa is Either<E, B>;
   <A>(predicate: Predicate<A>): <E>(fa: Either<E, A>) => fa is Either<E, A>;
} = <A>(predicate: Predicate<A>) => <E>(fa: Either<E, A>): fa is Either<E, A> =>
   _exists(fa, predicate);

export const widenE = <E1>() => <E, A>(fa: Either<E, A>): Either<E | E1, A> => fa;

export const widenA = <A1>() => <E, A>(fa: Either<E, A>): Either<E, A | A1> => fa;
