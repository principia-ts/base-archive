import { Eq } from "../Eq";
import { Foldable } from "../Foldable";
import { pipe } from "../Function";
import type * as HKT from "../HKT";
import { Semigroup } from "../Semigroup";
import { _lookupWithKey } from "./combinators";

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

export const fromFoldable = <F extends HKT.URIS, K, A, C = HKT.Auto>(E: Eq<K>, S: Semigroup<A>, F: Foldable<F, C>) => (
   fka: HKT.Kind<
      F,
      C,
      HKT.Initial<C, "N">,
      HKT.Initial<C, "K">,
      HKT.Initial<C, "Q">,
      HKT.Initial<C, "W">,
      HKT.Initial<C, "X">,
      HKT.Initial<C, "I">,
      HKT.Initial<C, "S">,
      HKT.Initial<C, "R">,
      HKT.Initial<C, "E">,
      readonly [K, A]
   >
): ReadonlyMap<K, A> => {
   const _lookupWithKeyE = _lookupWithKey(E);
   return pipe(
      fka,
      F.reduce(new Map<K, A>(), (b, [k, a]) => {
         const oka = _lookupWithKeyE(b, k);
         if (oka._tag === "Just") {
            b.set(oka.value[0], S.concat(oka.value[1])(a));
         } else {
            b.set(k, a);
         }
         return b;
      })
   );
};
