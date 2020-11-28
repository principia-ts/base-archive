import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor, map_ } from "./functor";
import type { LazyPromise, URI, V } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Apply LazyPromise
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
export function ap_<A, B>(fab: LazyPromise<(a: A) => B>, fa: LazyPromise<A>): LazyPromise<B> {
  return () => Promise.all([fab(), fa()]).then(([f, a]) => f(a));
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
export function ap<A>(fa: LazyPromise<A>): <B>(fab: LazyPromise<(a: A) => B>) => LazyPromise<B> {
  return (fab) => ap_(fab, fa);
}

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
export function apFirst_<A, B>(fa: LazyPromise<A>, fb: LazyPromise<B>): LazyPromise<A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  );
}

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
export function apFirst<B>(fb: LazyPromise<B>): <A>(fa: LazyPromise<A>) => LazyPromise<A> {
  return (fa) => apFirst_(fa, fb);
}

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
export function apSecond_<A, B>(fa: LazyPromise<A>, fb: LazyPromise<B>): LazyPromise<B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  );
}

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
export function apSecond<B>(fb: LazyPromise<B>): <A>(fa: LazyPromise<A>) => LazyPromise<B> {
  return (fa) => apSecond_(fa, fb);
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
export function liftA2<A, B, C>(
  f: (a: A) => (b: B) => C
): (fa: LazyPromise<A>) => (fb: LazyPromise<B>) => LazyPromise<C> {
  return (fa) => (fb) =>
    ap_(
      map_(fa, (a) => (b) => f(a)(b)),
      fb
    );
}

/**
 * ```haskell
 * zipWith_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `LazyPromise`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zipWith_<A, B, C>(
  fa: LazyPromise<A>,
  fb: LazyPromise<B>,
  f: (a: A, b: B) => C
): LazyPromise<C> {
  return () => Promise.all([fa(), fb()]).then(([a, b]) => f(a, b));
}

/**
 * ```haskell
 * zipWith :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `LazyPromise`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zipWith<A, B, C>(
  fb: LazyPromise<B>,
  f: (a: A, b: B) => C
): (fa: LazyPromise<A>) => LazyPromise<C> {
  return (fa) => zipWith_(fa, fb, f);
}

/**
 * ```haskell
 * apSeq_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Sequentially apply a function to an argument under a type constructor. For a parallel version, see `ap_`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSeq_<A, B>(fab: LazyPromise<(a: A) => B>, fa: LazyPromise<A>): LazyPromise<B> {
  return chain_(fab, (f) => map_(fa, f));
}

/**
 * ```haskell
 * apSeq :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Sequentially apply a function to an argument under a type constructor. For a parallel version, see `ap`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSeq<A>(fa: LazyPromise<A>): <B>(fab: LazyPromise<(a: A) => B>) => LazyPromise<B> {
  return (fab) => apSeq_(fab, fa);
}

/**
 * ```haskell
 * apFirstSeq_ :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the first. For a parallel version, see `apFirst_`
 *
 * @category Uncurried Apply
 * @since 1.0.0
 */
export function apFirstSeq_<A, B>(fa: LazyPromise<A>, fb: LazyPromise<B>): LazyPromise<A> {
  return apSeq_(
    map_(fa, (a) => () => a),
    fb
  );
}

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the first. For a parallel version, see `apFirst`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apFirstSeq<B>(fb: LazyPromise<B>): <A>(fa: LazyPromise<A>) => LazyPromise<A> {
  return (fa) => apFirstSeq_(fa, fb);
}

/**
 * ```haskell
 * apSecondSeq_ :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the second. For a parallel version, see `apSecond_`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecondSeq_<A, B>(fa: LazyPromise<A>, fb: LazyPromise<B>): LazyPromise<B> {
  return apSeq_(
    map_(fa, () => (b: B) => b),
    fb
  );
}

/**
 * ```haskell
 * apSecondSeq :: Apply f => f b -> f a -> f b
 * ```
 *
 * Sequentially combine two effectful actions, keeping only the result of the second. For a parallel version, see `apSecond`
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecondSeq<B>(fb: LazyPromise<B>): <A>(fa: LazyPromise<A>) => LazyPromise<B> {
  return (fa) => apSecondSeq_(fa, fb);
}

/**
 * ```haskell
 * zipWithSeq_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Sequentially applies both `LazyPromise`s and maps their results with function `f`. For a parallel version, see `zipWith_`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zipWithSeq_<A, B, C>(
  fa: LazyPromise<A>,
  fb: LazyPromise<B>,
  f: (a: A, b: B) => C
): LazyPromise<C> {
  return chain_(fa, (a) => map_(fb, (b) => f(a, b)));
}

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Sequentially applies both `LazyPromise`s and maps their results with function `f`. For a parallel version, see `mapBoth`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zipWithSeq<A, B, C>(
  fb: LazyPromise<B>,
  f: (a: A, b: B) => C
): (fa: LazyPromise<A>) => LazyPromise<C> {
  return (fa) => zipWithSeq_(fa, fb, f);
}

/**
 * ```haskell
 * liftA2Seq :: Apply f => (a -> b -> c) -> f a -> f b -> f c
 * ```
 *
 * Lifts a binary function to actions. `LazyPromise`s will be evaluated sequentially. For a parallel version, see `lift2`
 *
 * @category Apply
 * @since 1.0.0
 */
export function liftA2Seq<A, B, C>(
  f: (a: A) => (b: B) => C
): (fa: LazyPromise<A>) => (fb: LazyPromise<B>) => LazyPromise<C> {
  return (fa) => (fb) => chain_(fa, (a) => map_(fb, (b) => f(a)(b)));
}

export const ApplyPar: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  zipWith_,
  zipWith
});

export const ApplySeq: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_: apSeq_,
  ap: apSeq,
  zipWith_: zipWithSeq_,
  zipWith: zipWithSeq
});
