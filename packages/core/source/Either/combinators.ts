import type { Eq } from "@principia/prelude/Eq";

import type { Predicate, Refinement } from "../Function";
import { fromNullableK_, left, right } from "./constructors";
import { map_ } from "./functor";
import { isLeft } from "./guards";
import type { Either } from "./model";
import { chain, chain_ } from "./monad";

/*
 * -------------------------------------------
 * Either Combinators
 * -------------------------------------------
 */

/**
 * orElse_ :: Either E => (E a b, (a -> b)) -> a | b
 */
export const orElse_ = <E, A, G, B>(fa: Either<E, A>, onLeft: (e: E) => Either<G, B>): Either<G, A | B> =>
   isLeft(fa) ? onLeft(fa.left) : fa;

/**
 * orElse :: Either E => (a -> b) -> E a b -> a | b
 */
export const orElse: <E, A, G, B>(onLeft: (e: E) => Either<G, B>) => (fa: Either<E, A | B>) => Either<G, A | B> = (
   f
) => (fa) => orElse_(fa, f);

/**
 * orElseEither_ :: Either E => (E a b, (a -> E c a)) -> E c (E a b)
 */
export const orElseEither_ = <E, A, G, B>(fa: Either<E, A>, onLeft: (e: E) => Either<G, B>): Either<G, Either<A, B>> =>
   orElse_(map_(fa, left), (e) => map_(onLeft(e), right));

/**
 * orElseEither :: Either E => (a -> E c a) -> E a b -> E c (E a b)
 */
export const orElseEither: <E, E1, B>(
   onLeft: (e: E) => Either<E1, B>
) => <A>(fa: Either<E, A>) => Either<E1, Either<A, B>> = (f) => (fa) => orElseEither_(fa, f);

/**
 * filterOrElse_ :: (Either E, Bool B) => (E a b, (a -> B), (a -> c)) -> E (a | c) b
 */
export const filterOrElse_: {
   <E, A, B extends A, G>(fa: Either<E, A>, refinement: Refinement<A, B>, onFalse: (a: A) => G): Either<E | G, B>;
   <E, A, G>(fa: Either<E, A>, predicate: Predicate<A>, onFalse: (a: A) => G): Either<E | G, A>;
} = <E, A, G>(fa: Either<E, A>, predicate: Predicate<A>, onFalse: (a: A) => G) =>
   isLeft(fa) ? fa : predicate(fa.right) ? right(fa.right) : left(onFalse(fa.right));

/**
 * filterOrElse :: (Either E, Bool B) => ((a -> B), (a -> c)) -> E a b -> E (a | c) b
 */
export const filterOrElse: {
   <A, B extends A, G>(refinement: Refinement<A, B>, onFalse: (a: A) => G): <E>(fa: Either<E, A>) => Either<E | G, B>;
   <A, G>(predicate: Predicate<A>, onFalse: (a: A) => G): <E>(fa: Either<E, A>) => Either<E | G, A>;
} = <A, G>(predicate: Predicate<A>, onFalse: (a: A) => G) => <E>(fa: Either<E, A>) =>
   filterOrElse_(fa, predicate, onFalse);

export const elem = <A>(E: Eq<A>) => <E>(a: A, fa: Either<E, A>): boolean =>
   isLeft(fa) ? false : E.equals(a)(fa.right);

export const exists_: {
   <E, A, B extends A>(fa: Either<E, A>, refinement: Refinement<A, B>): fa is Either<E, B>;
   <E, A>(fa: Either<E, A>, predicate: Predicate<A>): fa is Either<E, A>;
} = <E, A>(fa: Either<E, A>, predicate: Predicate<A>): fa is Either<E, A> => (isLeft(fa) ? false : predicate(fa.right));

export const exists: {
   <A, B extends A>(refinement: Refinement<A, B>): <E>(fa: Either<E, A>) => fa is Either<E, B>;
   <A>(predicate: Predicate<A>): <E>(fa: Either<E, A>) => fa is Either<E, A>;
} = <A>(predicate: Predicate<A>) => <E>(fa: Either<E, A>): fa is Either<E, A> => exists_(fa, predicate);

export const chainNullableK_ = <E, A, B>(
   ma: Either<E, A>,
   e: () => E,
   f: (a: A) => B | null | undefined
): Either<E, NonNullable<B>> => chain_(ma, fromNullableK_(f, e));

export const chainNullableK = <E, A, B>(e: () => E, f: (a: A) => B | null | undefined) => (
   ma: Either<E, A>
): Either<E, NonNullable<B>> => chainNullableK_(ma, e, f);
