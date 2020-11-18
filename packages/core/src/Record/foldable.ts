import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";

import { identity, pipe } from "../Function";
import type { ReadonlyRecord, URI, V } from "./model";
import { keys } from "./utils";

const _hasOwnProperty = Object.prototype.hasOwnProperty;

/*
 * -------------------------------------------
 * Foldable Record
 * -------------------------------------------
 */

/**
 * ```haskell
 * reduceWithIndex_ :: (FoldableWithIndex t, Index k) => (t a, b, ((k, b, a) -> b)) -> b
 * ```
 */
export function reduceWithIndex_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  b: B,
  f: (k: N, b: B, a: A) => B
): B {
  let out = b;
  const ks = keys(fa);
  const len = ks.length;
  for (let i = 0; i < len; i++) {
    const k = ks[i];
    out = f(k, out, fa[k]);
  }
  return out;
}

/**
 * ```haskell
 * reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t a -> b
 * ```
 */
export function reduceWithIndex<N extends string, A, B>(
  b: B,
  f: (k: N, b: B, a: A) => B
): (fa: ReadonlyRecord<N, A>) => B {
  return (fa) => reduceWithIndex_(fa, b, f);
}

/**
 * ```haskell
 * reduce_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 */
export function reduce_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  b: B,
  f: (b: B, a: A) => B
): B {
  return reduceWithIndex_(fa, b, (_, acc, a) => f(acc, a));
}

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 */
export function reduce<A, B>(
  b: B,
  f: (b: B, a: A) => B
): <N extends string>(fa: Readonly<Record<N, A>>) => B {
  return (fa) => reduce_(fa, b, f);
}

/**
 * ```haskell
 * reduceRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, a, b) -> b)) -> b
 * ```
 */
export function reduceRightWithIndex_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  b: B,
  f: (k: N, a: A, b: B) => B
): B {
  let out = b;
  const ks = keys(fa);
  const len = ks.length;
  for (let i = len - 1; i >= 0; i--) {
    const k = ks[i];
    out = f(k, fa[k], out);
  }
  return out;
}

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t a -> b
 * ```
 */
export function reduceRightWithIndex<N extends string, A, B>(
  b: B,
  f: (k: N, a: A, b: B) => B
): (fa: ReadonlyRecord<N, A>) => B {
  return (fa) => reduceRightWithIndex_(fa, b, f);
}

/**
 * ```haskell
 * reduceRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 */
export function reduceRight_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  b: B,
  f: (a: A, b: B) => B
): B {
  return reduceRightWithIndex_(fa, b, (_, a, acc) => f(a, acc));
}

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 */
export function reduceRight<A, B>(
  b: B,
  f: (a: A, b: B) => B
): <N extends string>(fa: Readonly<Record<N, A>>) => B {
  return (fa) => reduceRight_(fa, b, f);
}

export function foldMapWithIndex_<M>(
  M: Monoid<M>
): <N extends string, A>(fa: Readonly<Record<N, A>>, f: (k: N, a: A) => M) => M {
  return (fa, f) => {
    let out = M.nat;
    const ks = keys(fa);
    const len = ks.length;
    for (let i = 0; i < len; i++) {
      const k = ks[i];
      out = M.combine_(out, f(k, fa[k]));
    }
    return out;
  };
}

export function foldMapWithIndex<M>(
  M: Monoid<M>
): <N extends string, A>(f: (k: N, a: A) => M) => (fa: Readonly<Record<N, A>>) => M {
  return (f) => (fa) => foldMapWithIndex_(M)(fa, f);
}

export function foldMap_<M>(
  M: Monoid<M>
): <N extends string, A>(fa: Readonly<Record<N, A>>, f: (a: A) => M) => M {
  return (fa, f) => foldMapWithIndex_(M)(fa, (_, a) => f(a));
}

export function foldMap<M>(
  M: Monoid<M>
): <A>(f: (a: A) => M) => <N extends string>(fa: Readonly<Record<N, A>>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f);
}

export function fromFoldableMap<B, F extends HKT.URIS, C = HKT.Auto>(
  S: P.Semigroup<B>,
  F: P.Foldable<F, C>
) {
  return <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, N extends string>(
    fa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A) => readonly [N, B]
  ): ReadonlyRecord<N, B> =>
    pipe(
      fa,
      F.reduce<A, Record<N, B>>({} as any, (r, a) => {
        const [k, b] = f(a);
        r[k] = _hasOwnProperty.call(r, k) ? S.combine_(r[k], b) : b;
        return r;
      })
    );
}

export function fromFoldable<A, F extends HKT.URIS, C = HKT.Auto>(
  S: P.Semigroup<A>,
  F: P.Foldable<F, C>
) {
  const fromFoldableMapS = fromFoldableMap(S, F);
  return <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, N extends string>(
    fa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, readonly [N, A]>
  ): ReadonlyRecord<N, A> => fromFoldableMapS(fa, identity);
}

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
  reduce_: reduce_,
  foldMap_: foldMap_,
  reduceRight_: reduceRight_,
  reduce,
  foldMap,
  reduceRight
});

export const FoldableWithIndex: P.FoldableWithIndex<[URI], V> = HKT.instance({
  ...Foldable,
  reduceWithIndex_: reduceWithIndex_,
  foldMapWithIndex_: foldMapWithIndex_,
  reduceRightWithIndex_: reduceRightWithIndex_,
  reduceWithIndex,
  foldMapWithIndex,
  reduceRightWithIndex
});
