import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { bind_, flow } from "../Function";
import { left, right } from "./constructors";
import { Functor, map, map_ } from "./functor";
import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply Either
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
export const ap_ = <E, A, G, B>(fab: Either<G, (a: A) => B>, fa: Either<E, A>): Either<E | G, B> =>
   isLeft(fab) ? fab : isLeft(fa) ? fa : right(fab.right(fa.right));

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
export const ap = <E, A>(fa: Either<E, A>) => <G, B>(fab: Either<G, (a: A) => B>): Either<E | G, B> => ap_(fab, fa);

/**
 * ```haskell
 * apFirst_ :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirst_ = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirst = <G, B>(fb: Either<G, B>) => <E, A>(fa: Either<E, A>): Either<E | G, A> => apFirst_(fa, fb);

/**
 * ```haskell
 * apSecond_ :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond_ = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond = <G, B>(fb: Either<G, B>) => <E, A>(fa: Either<E, A>): Either<E | G, B> => apSecond_(fa, fb);

/**
 * ```haskell
 * mapBoth_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Either`s and if both are `Right`, maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth_ = <E, A, G, B, C>(fa: Either<E, A>, fb: Either<G, B>, f: (a: A, b: B) => C): Either<E | G, C> =>
   ap_(
      map_(fa, (a) => (b: B) => f(a, b)),
      fb
   );

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `Either`s and if both are `Right`, maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth = <A, G, B, C>(fb: Either<G, B>, f: (a: A, b: B) => C) => <E>(
   fa: Either<E, A>
): Either<E | G, C> => mapBoth_(fa, fb, f);

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
export const liftA2 = <A, B, C>(f: (a: A) => (b: B) => C) => <E>(fa: Either<E, A>) => <G>(
   fb: Either<G, B>
): Either<E | G, C> => (isLeft(fa) ? left(fa.left) : isLeft(fb) ? left(fb.left) : right(f(fa.right)(fb.right)));

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   ap_,
   mapBoth,
   mapBoth_
});

export const tuple = P.tupleF(Apply);

export const mapN: P.MapNFn<[URI], V> = P.mapNF(Apply);

export const struct = P.structF(Apply);

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
export const apS = <N extends string, A, E1, B>(
   name: Exclude<N, keyof A>,
   fb: Either<E1, B>
): (<E>(fa: Either<E, A>) => Either<E | E1, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
   flow(
      map((a) => (b: B) => bind_(a, name, b)),
      ap(fb)
   );
