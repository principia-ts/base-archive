import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import { Functor, map } from "./functor";
import type { URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Array
 * -------------------------------------------
 */

export function chainWithIndex_<A, B>(
  fa: ReadonlyArray<A>,
  f: (i: number, a: A) => ReadonlyArray<B>
): ReadonlyArray<B> {
  let outLen = 0;
  const len = fa.length;
  const temp = new Array(len);
  for (let i = 0; i < len; i++) {
    const e = fa[i];
    const arr = f(i, e);
    outLen += arr.length;
    temp[i] = arr;
  }
  const out = Array(outLen);
  let start = 0;
  for (let i = 0; i < len; i++) {
    const arr = temp[i];
    const l = arr.length;
    for (let j = 0; j < l; j++) {
      out[j + start] = arr[j];
    }
    start += l;
  }
  return out;
}

export function chainWithIndex<A, B>(
  f: (i: number, a: A) => ReadonlyArray<B>
): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => chainWithIndex_(fa, f);
}

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
export function chain_<A, B>(
  fa: ReadonlyArray<A>,
  f: (a: A) => ReadonlyArray<B>
): ReadonlyArray<B> {
  return chainWithIndex_(fa, (_, a) => f(a));
}

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
export function chain<A, B>(
  f: (a: A) => ReadonlyArray<B>
): (fa: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (fa) => chain_(fa, f);
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `NonEmptyArray`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<A>(mma: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A> {
  let rLen = 0;
  const len = mma.length;
  for (let i = 0; i < len; i++) {
    rLen += mma[i].length;
  }
  const r = Array(rLen);
  let start = 0;
  for (let i = 0; i < len; i++) {
    const arr = mma[i];
    const l = arr.length;
    for (let j = 0; j < l; j++) {
      r[j + start] = arr[j];
    }
    start += l;
  }
  return r;
}

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
export function tap_<A, B>(ma: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<A> {
  return chain_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  );
}

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
export function tap<A, B>(
  f: (a: A) => ReadonlyArray<B>
): (ma: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ma) => tap_(ma, f);
}

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  flatten,
  unit
});
