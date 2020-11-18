import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { ReadonlyRecord, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor Record
 * -------------------------------------------
 */

/**
 * ```haskell
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) => (f a, ((k, a) -> b)) -> f b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function mapWithIndex_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  f: (k: N, a: A) => B
): ReadonlyRecord<N, B> {
  const out = {} as Record<N, B>;
  const keys = Object.keys(fa);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as keyof typeof fa;
    out[k] = f(k, fa[k]);
  }
  return out;
}

/**
 * ```haskell
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) => ((k, a) -> b) -> f a -> f b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function mapWithIndex<N extends string, A, B>(
  f: (k: N, a: A) => B
): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<N, B> {
  return (fa) => mapWithIndex_(fa, f);
}

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map a record passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  f: (a: A) => B
): ReadonlyRecord<N, B> {
  return mapWithIndex_(fa, (_, a) => f(a));
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Map a record passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(
  f: (a: A) => B
): <N extends string>(fa: Readonly<Record<N, A>>) => Readonly<Record<N, B>> {
  return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map,
  map_: map_
});

export const FunctorWithIndex: P.FunctorWithIndex<[URI], V> = HKT.instance({
  ...Functor,
  mapWithIndex,
  mapWithIndex_: mapWithIndex_
});
