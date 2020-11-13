import type { Foldable, Semigroup } from "@principia/prelude";
import type { Eq } from "@principia/prelude/Eq";
import type * as HKT from "@principia/prelude/HKT";

import { pipe } from "../Function";
import { lookupWithKey_ } from "./combinators";

export const empty: ReadonlyMap<never, never> = new Map<never, never>();

/**
 * Create from a key-value array
 */
export function make<K, V>(values: ReadonlyArray<readonly [K, V]>): ReadonlyMap<K, V> {
   return new Map(values);
}

/**
 * Construct a new Readonly Map
 */
export function fromMutable<K, A>(m: Map<K, A>): ReadonlyMap<K, A> {
   return new Map(m);
}

/**
 * Create a map with one key/value pair
 */
export function singleton<K, A>(k: K, a: A): ReadonlyMap<K, A> {
   return new Map([[k, a]]);
}

export function fromFoldable<F extends HKT.URIS, K, A, C = HKT.Auto>(E: Eq<K>, S: Semigroup<A>, F: Foldable<F, C>) {
   return <N extends string, K_, Q, W, X, I, S, R, E>(
      fka: HKT.Kind<F, C, N, K_, Q, W, X, I, S, R, E, readonly [K, A]>
   ): ReadonlyMap<K, A> => {
      const lookupWithKeyE_ = lookupWithKey_(E);
      return pipe(
         fka,
         F.reduce(new Map<K, A>(), (b, [k, a]) => {
            const oka = lookupWithKeyE_(b, k);
            if (oka._tag === "Some") {
               b.set(oka.value[0], S.combine_(oka.value[1], a));
            } else {
               b.set(k, a);
            }
            return b;
         })
      );
   };
}
