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
export function ap_<A, B>(fab: Option<(a: A) => B>, fa: Option<A>): Option<B> {
   return isNone(fab) ? none() : isNone(fa) ? none() : some(fab.value(fa.value));
}

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
export function ap<A>(fa: Option<A>): <B>(fab: Option<(a: A) => B>) => Option<B> {
   return (fab) => ap_(fab, fa);
}

export function apFirst_<A, B>(fa: Option<A>, fb: Option<B>): Option<A> {
   return ap_(
      map_(fa, (a) => () => a),
      fb
   );
}

export function apFirst<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<A> {
   return (fa) => apFirst_(fa, fb);
}

export function apSecond_<A, B>(fa: Option<A>, fb: Option<B>): Option<B> {
   return ap_(
      map_(fa, () => (b: B) => b),
      fb
   );
}

export function apSecond<B>(fb: Option<B>): <A>(fa: Option<A>) => Option<B> {
   return (fa) => apSecond_(fa, fb);
}

/**
 * ```haskell
 * mapBoth_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Option`s and if both are `Some`,  maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapBoth_<A, B, C>(fa: Option<A>, fb: Option<B>, f: (a: A, b: B) => C): Option<C> {
   return ap_(
      map_(fa, (a) => (b: B) => f(a, b)),
      fb
   );
}

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `Option`s and if both are `Some`, maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */

export function mapBoth<A, B, C>(fb: Option<B>, f: (a: A, b: B) => C): (fa: Option<A>) => Option<C> {
   return (fa) => mapBoth_(fa, fb, f);
}

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
export function liftA2<A, B, C>(f: (a: A) => (b: B) => C): (fa: Option<A>) => (fb: Option<B>) => Option<C> {
   return (fa) => (fb) => (isNone(fa) ? none() : isNone(fb) ? none() : some(f(fa.value)(fb.value)));
}

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
export function apS<N extends string, A, B>(
   name: Exclude<N, keyof A>,
   fb: Option<B>
): (
   fa: Option<A>
) => Option<
   {
      [K in keyof A | N]: K extends keyof A ? A[K] : B;
   }
> {
   return flow(
      map((a) => (b: B) => bind_(a, name, b)),
      ap(fb)
   );
}

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_,
   ap,
   mapBoth_,
   mapBoth
});

export const struct = P.structF(Apply);

export const tuple = P.tupleF(Apply);

export const mapN = P.mapNF(Apply);
