import type { Monoid, Semigroup } from "@principia/prelude";
import { makeMonoid } from "@principia/prelude";
import * as P from "@principia/prelude";
import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";
import * as HKT from "@principia/prelude/HKT";
import type { Ord } from "@principia/prelude/Ord";
import type { Show } from "@principia/prelude/Show";

import { pipe } from "../Function";
import * as O from "../Option";
import { keys, lookupWithKey_ } from "./combinators";
import { empty } from "./constructors";
import { isSubmap_ } from "./guards";
import {
   compact,
   filter,
   filter_,
   filterWithIndex,
   filterWithIndex_,
   map,
   map_,
   mapEither,
   mapEither_,
   mapEitherWithIndex,
   mapEitherWithIndex_,
   mapOption,
   mapOption_,
   mapOptionWithIndex,
   mapOptionWithIndex_,
   mapWithIndex,
   mapWithIndex_,
   partition,
   partition_,
   partitionWithIndex,
   partitionWithIndex_,
   separate
} from "./methods";
import type { URI, V } from "./model";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const getShow = <K, A>(SK: Show<K>, SA: Show<A>): Show<ReadonlyMap<K, A>> => ({
   show: (m) => {
      let elements = "";
      m.forEach((a, k) => {
         elements += `[${SK.show(k)}, ${SA.show(a)}], `;
      });
      if (elements !== "") {
         elements = elements.substring(0, elements.length - 2);
      }
      return `Map([${elements}])`;
   }
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getEq = <K, A>(EK: Eq<K>, EA: Eq<A>): Eq<ReadonlyMap<K, A>> => {
   const isSubmapKA_ = isSubmap_(EK, EA);
   return fromEquals((x, y) => isSubmapKA_(x, y) && isSubmapKA_(y, x));
};

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 *
 * @category Instances
 * @since 1.0.0
 */
export function getMonoid<K, A>(SK: Eq<K>, SA: Semigroup<A>): Monoid<ReadonlyMap<K, A>> {
   const lookupWithKeyK_ = lookupWithKey_(SK);
   return makeMonoid<ReadonlyMap<K, A>>((mx, my) => {
      if (mx === empty) {
         return my;
      }
      if (my === empty) {
         return mx;
      }
      const r = new Map(mx);
      const entries = my.entries();
      let e: Next<readonly [K, A]>;
      while (!(e = entries.next()).done) {
         const [k, a] = e.value;
         const mxOptA = lookupWithKeyK_(mx, k);
         if (O.isSome(mxOptA)) {
            r.set(mxOptA.value[0], SA.combine_(mxOptA.value[1], a));
         } else {
            r.set(k, a);
         }
      }
      return r;
   }, empty);
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const FunctorWithIndex: P.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Compactable: P.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Filterable: P.Filterable<[URI], V> = HKT.instance({
   ...Functor,
   filter_: filter_,
   mapOption_: mapOption_,
   partition_: partition_,
   mapEither_: mapEither_,
   filter,
   mapOption,
   partition,
   mapEither
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFilterableWithIndex = <K = never>(): P.FilterableWithIndex<[URI], V & HKT.Fix<"K", K>> =>
   HKT.instance({
      mapOptionWithIndex_: mapOptionWithIndex_,
      filterWithIndex_: filterWithIndex_,
      mapEitherWithIndex_: mapEitherWithIndex_,
      partitionWithIndex_: partitionWithIndex_,
      filterWithIndex,
      mapOptionWithIndex,
      partitionWithIndex,
      mapEitherWithIndex
   });

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFoldableWithIndex = <K>(O: Ord<K>): P.FoldableWithIndex<[URI], V & HKT.Fix<"K", K>> => {
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
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getTraversableWithindex = <K>(O: Ord<K>): P.TraversableWithIndex<[URI], V & HKT.Fix<"K", K>> => {
   type CK = V & HKT.Fix<"K", K>;

   const keysO = keys(O);

   const traverseWithIndex_ = P.implementTraverseWithIndex_<[URI], CK>()((_) => (G) => (ta, f) => {
      type _ = typeof _;
      let gm: HKT.HKT<_["G"], ReadonlyMap<_["K"], _["B"]>> = P.pureF(G)(empty);
      const ks = keysO(ta);
      const len = ks.length;
      for (let i = 0; i < len; i++) {
         const key = ks[i];
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const a = ta.get(key)!;
         gm = pipe(
            gm,
            G.map((m) => (b: typeof _.B) => new Map(m).set(key, b)),
            P.apF(G)(f(key, a))
         );
      }
      return gm;
   });

   return HKT.instance<P.TraversableWithIndex<[URI], CK>>({
      ...FunctorWithIndex,
      traverseWithIndex_,
      traverseWithIndex: (G) => (f) => (ta) => traverseWithIndex_(G)(ta, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getWitherable = <K>(O: Ord<K>): P.WitherableWithIndex<[URI], V & HKT.Fix<"K", K>> => {
   type CK = V & HKT.Fix<"K", K>;

   const { traverseWithIndex_ } = getTraversableWithindex(O);

   const witherWithIndex_ = P.implementWitherWithIndex_<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(traverseWithIndex_(G)(wa, f), G.map(compact))
   );

   const wiltWithIndex_ = P.implementWiltWithIndex_<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(traverseWithIndex_(G)(wa, f), G.map(separate))
   );

   return HKT.instance<P.WitherableWithIndex<[URI], CK>>({
      wiltWithIndex_: wiltWithIndex_,
      witherWithIndex_: witherWithIndex_,
      wiltWithIndex: (G) => (f) => (wa) => wiltWithIndex_(G)(wa, f),
      witherWithIndex: (G) => (f) => (wa) => witherWithIndex_(G)(wa, f)
   });
};
