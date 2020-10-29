import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { bind_, flow } from "../Function";
import { none, some } from "./constructors";
import { Functor, map, map_ } from "./functor";
import { isNone } from "./guards";
import type { Option, URI, V } from "./model";

/*
 * -------------------------------------------
 * Apply Option
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
export const ap_ = <A, B>(fab: Option<(a: A) => B>, fa: Option<A>): Option<B> =>
   isNone(fab) ? none() : isNone(fa) ? none() : some(fab.value(fa.value));

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
export const ap = <A>(fa: Option<A>) => <B>(fab: Option<(a: A) => B>): Option<B> => ap_(fab, fa);

export const apFirst_ = <A, B>(fa: Option<A>, fb: Option<B>): Option<A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<A> => apFirst_(fa, fb);

export const apSecond_ = <A, B>(fa: Option<A>, fb: Option<B>): Option<B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

export const apSecond = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<B> => apSecond_(fa, fb);

/**
 * ```haskell
 * mapBoth_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Maybe`s and if both are `Some`,  maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth_ = <A, B, C>(fa: Option<A>, fb: Option<B>, f: (a: A, b: B) => C): Option<C> =>
   ap_(
      map_(fa, (a) => (b: B) => f(a, b)),
      fb
   );

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `Maybe`s and if both are `Some`, maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */

export const mapBoth = <A, B, C>(fb: Option<B>, f: (a: A, b: B) => C) => (fa: Option<A>): Option<C> =>
   mapBoth_(fa, fb, f);

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
export const liftA2 = <A, B, C>(f: (a: A) => (b: B) => C) => (fa: Option<A>) => (fb: Option<B>): Option<C> =>
   isNone(fa) ? none() : isNone(fb) ? none() : some(f(fa.value)(fb.value));

/**
 * ```haskell
 * apS :: (Apply f, Nominal n) =>
 *    (n n3, f c)
 *    -> f ({ n1: a, n2: b, ... })
 *    -> f ({ n1: a, n2: b, n3: c })
 * ```
 *
 * A pipeable version of `sequenceS`
 *
 * @category Apply
 * @since 1.0.0
 */
export const apS = <N extends string, A, B>(
   name: Exclude<N, keyof A>,
   fb: Option<B>
): ((fa: Option<A>) => Option<{ [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
   flow(
      map((a) => (b: B) => bind_(a, name, b)),
      ap(fb)
   );

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_,
   ap,
   mapBoth_,
   mapBoth
});

export const sequenceS = P.sequenceSF(Apply);

export const sequenceT = P.sequenceTF(Apply);

export const mapN = P.mapNF(Apply);
