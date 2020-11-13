import type { Eq } from "@principia/prelude/Eq";

import type { Predicate, Refinement } from "../Function";
import { fromNullableK_, left, right } from "./constructors";
import { map_ } from "./functor";
import { isLeft } from "./guards";
import type { Either } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Either Combinators
 * -------------------------------------------
 */

/**
 * orElse_ :: Either E => (E a b, (a -> b)) -> a | b
 */
export function orElse_<E, A, G, B>(fa: Either<E, A>, onLeft: (e: E) => Either<G, B>): Either<G, A | B> {
   return isLeft(fa) ? onLeft(fa.left) : fa;
}

/**
 * orElse :: Either E => (a -> b) -> E a b -> a | b
 */
export function orElse<E, A, G, B>(onLeft: (e: E) => Either<G, B>): (fa: Either<E, A | B>) => Either<G, A | B> {
   return (fa) => orElse_(fa, onLeft);
}

/**
 * orElseEither_ :: Either E => (E a b, (a -> E c a)) -> E c (E a b)
 */
export function orElseEither_<E, A, G, B>(fa: Either<E, A>, onLeft: (e: E) => Either<G, B>): Either<G, Either<A, B>> {
   return orElse_(map_(fa, left), (e) => map_(onLeft(e), right));
}

/**
 * orElseEither :: Either E => (a -> E c a) -> E a b -> E c (E a b)
 */
export function orElseEither<E, E1, B>(
   onLeft: (e: E) => Either<E1, B>
): <A>(fa: Either<E, A>) => Either<E1, Either<A, B>> {
   return (fa) => orElseEither_(fa, onLeft);
}

/**
 * filterOrElse_ :: (Either E, Bool B) => (E a b, (a -> B), (a -> c)) -> E (a | c) b
 */
export function filterOrElse_<E, A, B extends A, G>(
   fa: Either<E, A>,
   refinement: Refinement<A, B>,
   onFalse: (a: A) => G
): Either<E | G, B>;
export function filterOrElse_<E, A, G>(
   fa: Either<E, A>,
   predicate: Predicate<A>,
   onFalse: (a: A) => G
): Either<E | G, A>;
export function filterOrElse_<E, A, G>(
   fa: Either<E, A>,
   predicate: Predicate<A>,
   onFalse: (a: A) => G
): Either<E | G, A> {
   return isLeft(fa) ? fa : predicate(fa.right) ? right(fa.right) : left(onFalse(fa.right));
}

/**
 * filterOrElse :: (Either E, Bool B) => ((a -> B), (a -> c)) -> E a b -> E (a | c) b
 */
export function filterOrElse<A, B extends A, G>(
   refinement: Refinement<A, B>,
   onFalse: (a: A) => G
): <E>(fa: Either<E, A>) => Either<E | G, B>;
export function filterOrElse<A, G>(
   predicate: Predicate<A>,
   onFalse: (a: A) => G
): <E>(fa: Either<E, A>) => Either<E | G, A>;
export function filterOrElse<A, G>(
   predicate: Predicate<A>,
   onFalse: (a: A) => G
): <E>(fa: Either<E, A>) => Either<E | G, A> {
   return (fa) => filterOrElse_(fa, predicate, onFalse);
}

export function elem<A>(E: Eq<A>): <E>(a: A, fa: Either<E, A>) => boolean {
   return (a, fa) => (isLeft(fa) ? false : E.equals(a)(fa.right));
}

export function exists_<E, A, B extends A>(fa: Either<E, A>, refinement: Refinement<A, B>): fa is Either<E, B>;
export function exists_<E, A>(fa: Either<E, A>, predicate: Predicate<A>): fa is Either<E, A>;
export function exists_<E, A>(fa: Either<E, A>, predicate: Predicate<A>): fa is Either<E, A> {
   return isLeft(fa) ? false : predicate(fa.right);
}

export function chainNullableK_<E, A, B>(
   ma: Either<E, A>,
   e: () => E,
   f: (a: A) => B | null | undefined
): Either<E, NonNullable<B>> {
   return chain_(ma, fromNullableK_(f, e));
}

export function chainNullableK<E, A, B>(
   e: () => E,
   f: (a: A) => B | null | undefined
): (ma: Either<E, A>) => Either<E, NonNullable<B>> {
   return (ma) => chainNullableK_(ma, e, f);
}
