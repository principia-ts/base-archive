import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import { compact, separate } from "./compactable";
import type { URI, V } from "./model";
import { traverseWithIndex_ } from "./traversable";

/*
 * -------------------------------------------
 * Witherable Record
 * -------------------------------------------
 */

/**
 * ```haskell
 * witherWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> (w k a, ((k, a) -> g (w k (Maybe b)))) -> g (w k b)
 * ```
 */
export const witherWithIndex_: P.WitherWithIndexFn_<[URI], V> = (G) => {
   const traverseG = traverseWithIndex_(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(compact));
};

/**
 * ```haskell
 * witherWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> ((k, a) -> g (w k (Maybe b))) -> w k a -> g (w k b)
 * ```
 */
export const witherWithIndex: P.WitherWithIndexFn<[URI], V> = (G) => (f) => (wa) => witherWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wither_ :: (Applicative g, Witherable w) =>
 *    g -> (w a, (a -> g (w (Maybe b)))) -> g (w b)
 * ```
 */
export const wither_: P.WitherFn_<[URI], V> = (G) => (wa, f) => witherWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wither :: (Applicative g, Witherable w) =>
 *    g -> (a -> g (w (Maybe b))) -> w a -> g (w b)
 * ```
 */
export const wither: P.WitherFn<[URI], V> = (G) => (f) => (wa) => wither_(G)(wa, f);

/**
 * ```haskell
 * wiltWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> (w k a, ((k, a) -> g (w k (Either b c)))) -> g (Separated (w k b) (w k c))
 * ```
 */
export const wiltWithIndex_: P.WiltWithIndexFn_<[URI], V> = P.implementWiltWithIndex_<[URI], V>()(() => (G) => {
   const traverseG = traverseWithIndex_(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
});

/**
 * ```haskell
 * wiltWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> ((k, a) -> g (w k (Either b c))) -> w k a -> g (Separated (w k b) (w k c))
 * ```
 */
export const wiltWithIndex: P.WiltWithIndexFn<[URI], V> = (G) => (f) => (wa) => wiltWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wilt_ :: (Applicative g, Witherable w) =>
 *    g -> (w a, (a -> g (w (Either b c)))) -> g (Separated (w b) (w c))
 * ```
 */
export const wilt_: P.WiltFn_<[URI], V> = (G) => (wa, f) => wiltWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wilt_ :: (Applicative g, Witherable w) =>
 *    g -> (a -> g (w (Either b c))) -> w a -> g (Separated (w b) (w c))
 * ```
 */
export const wilt: P.WiltFn<[URI], V> = (G) => (f) => (wa) => wilt_(G)(wa, f);

export const Witherable: P.Witherable<[URI], V> = HKT.instance({
   wither_,
   wilt_,
   wither,
   wilt
});

export const WitherableWithIndex: P.WitherableWithIndex<[URI], V> = HKT.instance({
   wiltWithIndex_,
   witherWithIndex_,
   witherWithIndex,
   wiltWithIndex
});
