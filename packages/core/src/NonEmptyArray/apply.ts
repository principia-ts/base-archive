import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as A from "../Array";
import { Functor } from "./functor";
import type { NonEmptyArray, URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply NonEmptyArray
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
export const ap_: <A, B>(fab: NonEmptyArray<(a: A) => B>, fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.ap_ as any;

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
export const ap: <A>(fa: NonEmptyArray<A>) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = A.ap_ as any;

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
export const apFirst_: <A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>) => NonEmptyArray<A> = A.apFirst_ as any;

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
export const apFirst: <B>(fb: NonEmptyArray<B>) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<A> = A.apFirst as any;

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
export const apSecond_: <A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>) => NonEmptyArray<B> = A.apSecond_ as any;

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
export const apSecond: <B>(fb: NonEmptyArray<B>) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.apSecond as any;

export const zipWith_: <A, B, C>(
   fa: NonEmptyArray<A>,
   fb: NonEmptyArray<B>,
   f: (a: A, b: B) => C
) => NonEmptyArray<C> = A.zipWith_ as any;

export const zipWith: <A, B, C>(
   fb: NonEmptyArray<B>,
   f: (a: A, b: B) => C
) => (fa: NonEmptyArray<A>) => NonEmptyArray<C> = A.zipWith as any;

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   ap_,
   mapBoth: zipWith,
   mapBoth_: zipWith_
});
