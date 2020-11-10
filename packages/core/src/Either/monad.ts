import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity, pipe } from "../Function";
import { Functor, map } from "./functor";
import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Either
 * -------------------------------------------
 */

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain_ = <E, A, G, B>(fa: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, B> =>
   isLeft(fa) ? fa : f(fa.right);

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain = <A, G, B>(f: (e: A) => Either<G, B>) => <E>(ma: Either<E, A>): Either<E | G, B> => chain_(ma, f);

/**
 * ```haskell
 * bind :: Monad m => m a -> (a -> m b) -> m b
 * ```
 *
 * A version of `chain` where the arguments are flipped
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind = <E, A>(ma: Either<E, A>) => <G, B>(f: (a: A) => Either<G, B>): Either<E | G, B> => chain_(ma, f);

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
export const tap_ = <E, A, G, B>(ma: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, A> =>
   chain_(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

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
export const tap = <A, G, B>(f: (a: A) => Either<G, B>) => <E>(ma: Either<E, A>): Either<E | G, A> => tap_(ma, f);

/**
 * ```haskell
 * chainFirst :: Monad m => (a -> m b) -> m a -> m a
 * ```
 * A synonym of `tap`.
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const chainFirst = tap;

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
export const flatten: <E, G, A>(mma: Either<E, Either<G, A>>) => Either<E | G, A> = chain(identity);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});
