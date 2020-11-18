import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";
import type { Ord } from "@principia/prelude/Ord";

import { keys } from "./combinators";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Foldable Map
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getFoldableWithIndex<K>(
  O: Ord<K>
): P.FoldableWithIndex<[URI], V & HKT.Fix<"K", K>> {
  type CK = V & HKT.Fix<"K", K>;
  const keysO = keys(O);
  const reduceWithIndex_: P.ReduceWithIndexFn_<[URI], CK> = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (k: K, b: B, a: A) => B
  ): B => {
    let out: B = b;
    const ks = keysO(fa);
    const len = ks.length;
    for (let i = 0; i < len; i++) {
      const k = ks[i];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out = f(k, out, fa.get(k)!);
    }
    return out;
  };
  const foldMapWithIndex_: P.FoldMapWithIndexFn_<[URI], CK> = <M>(M: Monoid<M>) => <A>(
    fa: ReadonlyMap<K, A>,
    f: (k: K, a: A) => M
  ): M => {
    let out: M = M.nat;
    const ks = keysO(fa);
    const len = ks.length;
    for (let i = 0; i < len; i++) {
      const k = ks[i];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out = M.combine_(out, f(k, fa.get(k)!));
    }
    return out;
  };
  const reduceRightWithIndex_: P.ReduceRightWithIndexFn_<[URI], CK> = <A, B>(
    fa: ReadonlyMap<K, A>,
    b: B,
    f: (k: K, a: A, b: B) => B
  ): B => {
    let out: B = b;
    const ks = keysO(fa);
    const len = ks.length;
    for (let i = len - 1; i >= 0; i--) {
      const k = ks[i];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out = f(k, fa.get(k)!, out);
    }
    return out;
  };

  return HKT.instance<P.FoldableWithIndex<[URI], CK>>({
    reduceWithIndex_,
    reduceWithIndex: (b, f) => (fa) => reduceWithIndex_(fa, b, f),
    foldMapWithIndex_,
    foldMapWithIndex: (M) => (f) => (fa) => foldMapWithIndex_(M)(fa, f),
    reduceRightWithIndex_,
    reduceRightWithIndex: (b, f) => (fa) => reduceRightWithIndex_(fa, b, f)
  });
}
