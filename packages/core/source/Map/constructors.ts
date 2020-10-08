import type { Eq } from "../Eq";
import type { Foldable } from "../Foldable";
import { pipe } from "../Function";
import type * as HKT from "../HKT";
import type { Semigroup } from "../Semigroup";
import { lookupWithKey_ } from "./combinators";

export const empty: ReadonlyMap<never, never> = new Map<never, never>();

/**
 * Create from a key-value array
 */
export const make = <K, V>(values: ReadonlyArray<readonly [K, V]>): ReadonlyMap<K, V> => new Map(values);

/**
 * Construct a new Readonly Map
 */
export const fromMutable = <K, A>(m: Map<K, A>): ReadonlyMap<K, A> => new Map(m);

/**
 * Create a map with one key/value pair
 */
export const singleton = <K, A>(k: K, a: A): ReadonlyMap<K, A> => new Map([[k, a]]);

export const fromFoldable = <F extends HKT.URIS, K, A, C = HKT.Auto>(E: Eq<K>, S: Semigroup<A>, F: Foldable<F, C>) => <
   N extends string,
   K_,
   Q,
   W,
   X,
   I,
   S,
   R,
   E
>(
   fka: HKT.Kind<F, C, N, K_, Q, W, X, I, S, R, E, readonly [K, A]>
): ReadonlyMap<K, A> => {
   const lookupWithKeyE_ = lookupWithKey_(E);
   return pipe(
      fka,
      F.reduce(new Map<K, A>(), (b, [k, a]) => {
         const oka = lookupWithKeyE_(b, k);
         if (oka._tag === "Some") {
            b.set(oka.value[0], S.concat(oka.value[1])(a));
         } else {
            b.set(k, a);
         }
         return b;
      })
   );
};
