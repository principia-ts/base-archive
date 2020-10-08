import type { Eq } from "../Eq";
import { fromEquals } from "../Eq";
import { pipe } from "../Function";
import * as HKT from "../HKT";
import type { Monoid } from "../Monoid";
import * as O from "../Option";
import type { Ord } from "../Ord";
import type { Semigroup } from "../Semigroup";
import type { Show } from "../Show";
import * as TC from "../typeclass-index";
import { keys, lookupWithKey_ } from "./combinators";
import { empty } from "./constructors";
import { isSubmap_ } from "./guards";
import type { URI, V } from "./Map";
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
   return fromEquals((x) => (y) => isSubmapKA_(x, y) && isSubmapKA_(y, x));
};

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 *
 * @category Instances
 * @since 1.0.0
 */
export function getMonoid<K, A>(SK: Eq<K>, SA: Semigroup<A>): Monoid<ReadonlyMap<K, A>> {
   const lookupWithKeyK_ = lookupWithKey_(SK);
   return {
      concat: (mx) => (my) => {
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
               r.set(mxOptA.value[0], SA.concat(mxOptA.value[1])(a));
            } else {
               r.set(k, a);
            }
         }
         return r;
      },
      empty
   };
}

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const FunctorWithIndex: TC.FunctorWithIndex<[URI], V> = HKT.instance({
   ...Functor,
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Compactable: TC.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Filterable: TC.Filterable<[URI], V> = HKT.instance({
   ...Functor,
   ...Compactable,
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
export const getFilterableWithIndex = <K = never>(): TC.FilterableWithIndex<[URI], V & HKT.Fix<"K", K>> =>
   HKT.instance({
      ...Filterable,
      ...FunctorWithIndex,
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
export const getWitherable = <K>(O: Ord<K>): TC.WitherableWithIndex<[URI], V & HKT.Fix<"K", K>> => {
   type CK = V & HKT.Fix<"K", K>;

   const keysO = keys(O);

   const reduceWithIndex_: TC.UC_ReduceWithIndexF<[URI], CK> = <A, B>(
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

   const reduce_: TC.UC_ReduceF<[URI], CK> = (fa, b, f) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a));

   const foldMapWithIndex_: TC.UC_FoldMapWithIndexF<[URI], CK> = <M>(M: Monoid<M>) => <A>(
      fa: ReadonlyMap<K, A>,
      f: (k: K, a: A) => M
   ): M => {
      let out: M = M.empty;
      const ks = keysO(fa);
      const len = ks.length;
      for (let i = 0; i < len; i++) {
         const k = ks[i];
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         out = M.concat(out)(f(k, fa.get(k)!));
      }
      return out;
   };

   const foldMap_: TC.UC_FoldMapF<[URI], CK> = (M) => (fa, f) => foldMapWithIndex_(M)(fa, (_, a) => f(a));

   const reduceRightWithIndex_: TC.UC_ReduceRightWithIndexF<[URI], CK> = <A, B>(
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

   const reduceRight_: TC.UC_ReduceRightF<[URI], CK> = (fa, b, f) => reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b));

   const traverseWithIndex_ = TC.implementUCTraverseWithIndex<[URI], CK>()((_) => (G) => (ta, f) => {
      type _ = typeof _;
      let gm: HKT.HKT<_["G"], ReadonlyMap<_["K"], _["B"]>> = G.pure(empty);
      const ks = keysO(ta);
      const len = ks.length;
      for (let i = 0; i < len; i++) {
         const key = ks[i];
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const a = ta.get(key)!;
         gm = pipe(
            gm,
            G.map((m) => (b: typeof _.B) => new Map(m).set(key, b)),
            G.ap(f(key, a))
         );
      }
      return gm;
   });

   const traverse_: TC.UC_TraverseF<[URI], CK> = (G) => (ta, f) => traverseWithIndex_(G)(ta, (_, a) => f(a));

   const sequence: TC.SequenceF<[URI], CK> = (G) => (ta) => traverseWithIndex_(G)(ta, (_, a) => a);

   const witherWithIndex_ = TC.implementUCWitherWithIndex<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(traverseWithIndex_(G)(wa, f), G.map(compact))
   );

   const wither_: TC.UC_WitherF<[URI], CK> = (G) => (wa, f) => witherWithIndex_(G)(wa, (_, a) => f(a));

   const wiltWithIndex_ = TC.implementUCWiltWithIndex<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(traverseWithIndex_(G)(wa, f), G.map(separate))
   );

   const wilt_: TC.UC_WiltF<[URI], CK> = (G) => (wa, f) => wiltWithIndex_(G)(wa, (_, a) => f(a));

   return HKT.instance<TC.WitherableWithIndex<[URI], CK>>({
      ...getFilterableWithIndex<K>(),
      reduceWithIndex_: reduceWithIndex_,
      reduce_: reduce_,
      foldMapWithIndex_: foldMapWithIndex_,
      foldMap_: foldMap_,
      reduceRightWithIndex_: reduceRightWithIndex_,
      reduceRight_: reduceRight_,
      traverseWithIndex_: traverseWithIndex_,
      traverse_: traverse_,
      wiltWithIndex_: wiltWithIndex_,
      wilt_: wilt_,
      witherWithIndex_: witherWithIndex_,
      wither_: wither_,
      reduceWithIndex: (b, f) => (fa) => reduceWithIndex_(fa, b, f),
      reduce: (b, f) => (fa) => reduce_(fa, b, f),
      foldMapWithIndex: (M) => (f) => (fa) => foldMapWithIndex_(M)(fa, f),
      foldMap: (M) => (f) => (fa) => foldMap_(M)(fa, f),
      reduceRightWithIndex: (b, f) => (fa) => reduceRightWithIndex_(fa, b, f),
      reduceRight: (b, f) => (fa) => reduceRight_(fa, b, f),
      traverseWithIndex: (G) => (f) => (ta) => traverseWithIndex_(G)(ta, f),
      traverse: (G) => (f) => (ta) => traverse_(G)(ta, f),
      wiltWithIndex: (G) => (f) => (wa) => wiltWithIndex_(G)(wa, f),
      wilt: (G) => (f) => (wa) => wilt_(G)(wa, f),
      witherWithIndex: (G) => (f) => (wa) => witherWithIndex_(G)(wa, f),
      wither: (G) => (f) => (wa) => wither_(G)(wa, f),
      sequence
   });
};
