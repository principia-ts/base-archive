import type * as TC from "@principia/prelude";

import { pipe } from "../Function";
import { compact, separate } from "./compactable";
import type { URI, V } from "./model";
import { traverseWithIndex_ } from "./traversable";

/*
 * -------------------------------------------
 * Witherable Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * witherWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> (w a, ((k, a) -> g (w (Option b))))
 *    -> g (w b)
 * ```
 */
export const witherWithIndex_: TC.WitherWithIndexFn_<[URI], V> = (G) => {
  const traverseG = traverseWithIndex_(G);
  return (wa, f) => pipe(traverseG(wa, f), G.map(compact));
};

/**
 * ```haskell
 * witherWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> ((k, a)
 *    -> g (w (Option b)))
 *    -> w a
 *    -> g (w b)
 * ```
 */
export const witherWithIndex: TC.WitherWithIndexFn<[URI], V> = (G) => (f) => (wa) =>
  witherWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wither_ :: (Applicative g, Witherable w) =>
 *    g
 *    -> (w a, (a -> g (w (Option b))))
 *    -> g (w b)
 * ```
 */
export const wither_: TC.WitherFn_<[URI], V> = (G) => (wa, f) =>
  witherWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wither :: (Applicative g, Witherable w) =>
 *    g
 *    -> (a -> g (w (Option b)))
 *    -> w a
 *    -> g (w b)
 * ```
 */
export const wither: TC.WitherFn<[URI], V> = (G) => (f) => (wa) => wither_(G)(wa, f);

/**
 * ```haskell
 * wiltWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> (w a, ((k, a) -> g (w (Either b c))))
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wiltWithIndex_: TC.WiltWithIndexFn_<[URI], V> = (G) => {
  const traverseG = traverseWithIndex_(G);
  return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
};

/**
 * ```haskell
 * wiltWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> ((k, a) -> g (w (Either b c)))
 *    -> w a
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wiltWithIndex: TC.WiltWithIndexFn<[URI], V> = (G) => (f) => (wa) =>
  wiltWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wilt_ :: (Applicative g, Witherable w) =>
 *    g
 *    -> (w a, (a -> g (w (Either b c))))
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wilt_: TC.WiltFn_<[URI], V> = (G) => (wa, f) => wiltWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wilt :: (Applicative g, Witherable w) =>
 *    g
 *    -> (a -> g (w (Either b c)))
 *    -> w a
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wilt: TC.WiltFn<[URI], V> = (G) => (f) => (wa) => wilt_(G)(wa, f);
