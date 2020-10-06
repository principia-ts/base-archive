import { Eq, fromEquals } from "../Eq";
import { pipe } from "../Function";
import * as HKT from "../HKT";
import * as Mb from "../Maybe";
import { Monoid } from "../Monoid";
import { Ord } from "../Ord";
import { Semigroup } from "../Semigroup";
import { Show } from "../Show";
import * as TC from "../typeclass-index";
import { _lookupWithKey, keys } from "./combinators";
import { empty } from "./constructors";
import { _isSubmap } from "./guards";
import { URI, V } from "./Map";
import {
   _filter,
   _filterWithIndex,
   _map,
   _mapEither,
   _mapEitherWithIndex,
   _mapMaybe,
   _mapMaybeWithIndex,
   _mapWithIndex,
   _partition,
   _partitionWithIndex,
   compact,
   filter,
   filterWithIndex,
   map,
   mapEither,
   mapEitherWithIndex,
   mapMaybe,
   mapMaybeWithIndex,
   mapWithIndex,
   partition,
   partitionWithIndex,
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
   const _isSubmapKA = _isSubmap(EK, EA);
   return fromEquals((x) => (y) => _isSubmapKA(x, y) && _isSubmapKA(y, x));
};

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 *
 * @category Instances
 * @since 1.0.0
 */
export function getMonoid<K, A>(SK: Eq<K>, SA: Semigroup<A>): Monoid<ReadonlyMap<K, A>> {
   const _lookupWithKeyK = _lookupWithKey(SK);
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
            const mxOptA = _lookupWithKeyK(mx, k);
            if (Mb.isJust(mxOptA)) {
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
   _map
});

export const FunctorWithIndex: TC.FunctorWithIndex<[URI], V> = HKT.instance({
   ...Functor,
   mapWithIndex,
   _mapWithIndex
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
   _filter,
   _mapMaybe,
   _partition,
   _mapEither,
   filter,
   mapMaybe,
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
      _mapMaybeWithIndex,
      _filterWithIndex,
      _mapEitherWithIndex,
      _partitionWithIndex,
      filterWithIndex,
      mapMaybeWithIndex,
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

   const _reduceWithIndex: TC.UC_ReduceWithIndexF<[URI], CK> = <A, B>(
      fa: ReadonlyMap<K, A>,
      b: B,
      f: (k: K, b: B, a: A) => B
   ): B => {
      let out: B = b;
      const ks = keysO(fa);
      const len = ks.length;
      for (let i = 0; i < len; i++) {
         const k = ks[i];
         out = f(k, out, fa.get(k)!);
      }
      return out;
   };

   const _reduce: TC.UC_ReduceF<[URI], CK> = (fa, b, f) => _reduceWithIndex(fa, b, (_, b, a) => f(b, a));

   const _foldMapWithIndex: TC.UC_FoldMapWithIndexF<[URI], CK> = <M>(M: Monoid<M>) => <A>(
      fa: ReadonlyMap<K, A>,
      f: (k: K, a: A) => M
   ): M => {
      let out: M = M.empty;
      const ks = keysO(fa);
      const len = ks.length;
      for (let i = 0; i < len; i++) {
         const k = ks[i];
         out = M.concat(out)(f(k, fa.get(k)!));
      }
      return out;
   };

   const _foldMap: TC.UC_FoldMapF<[URI], CK> = (M) => (fa, f) => _foldMapWithIndex(M)(fa, (_, a) => f(a));

   const _reduceRightWithIndex: TC.UC_ReduceRightWithIndexF<[URI], CK> = <A, B>(
      fa: ReadonlyMap<K, A>,
      b: B,
      f: (k: K, a: A, b: B) => B
   ): B => {
      let out: B = b;
      const ks = keysO(fa);
      const len = ks.length;
      for (let i = len - 1; i >= 0; i--) {
         const k = ks[i];
         out = f(k, fa.get(k)!, out);
      }
      return out;
   };

   const _reduceRight: TC.UC_ReduceRightF<[URI], CK> = (fa, b, f) => _reduceRightWithIndex(fa, b, (_, a, b) => f(a, b));

   const _traverseWithIndex = TC.implementUCTraverseWithIndex<[URI], CK>()((_) => (G) => (ta, f) => {
      type _ = typeof _;
      let gm: HKT.HKT<_["G"], ReadonlyMap<_["K"], _["B"]>> = G.pure(empty);
      const ks = keysO(ta);
      const len = ks.length;
      for (let i = 0; i < len; i++) {
         const key = ks[i];
         const a = ta.get(key)!;
         gm = pipe(
            gm,
            G.map((m) => (b: typeof _.B) => new Map(m).set(key, b)),
            G.ap(f(key, a))
         );
      }
      return gm;
   });

   const _traverse: TC.UC_TraverseF<[URI], CK> = (G) => (ta, f) => _traverseWithIndex(G)(ta, (_, a) => f(a));

   const sequence: TC.SequenceF<[URI], CK> = (G) => (ta) => _traverseWithIndex(G)(ta, (_, a) => a);

   const _witherWithIndex = TC.implementUCWitherWithIndex<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(_traverseWithIndex(G)(wa, f), G.map(compact))
   );

   const _wither: TC.UC_WitherF<[URI], CK> = (G) => (wa, f) => _witherWithIndex(G)(wa, (_, a) => f(a));

   const _wiltWithIndex = TC.implementUCWiltWithIndex<[URI], CK>()((_) => (G) => (wa, f) =>
      pipe(_traverseWithIndex(G)(wa, f), G.map(separate))
   );

   const _wilt: TC.UC_WiltF<[URI], CK> = (G) => (wa, f) => _wiltWithIndex(G)(wa, (_, a) => f(a));

   return HKT.instance<TC.WitherableWithIndex<[URI], CK>>({
      ...getFilterableWithIndex<K>(),
      _reduceWithIndex,
      _reduce,
      _foldMapWithIndex,
      _foldMap,
      _reduceRightWithIndex,
      _reduceRight,
      _traverseWithIndex,
      _traverse,
      _wiltWithIndex,
      _wilt,
      _witherWithIndex,
      _wither,
      reduceWithIndex: (b, f) => (fa) => _reduceWithIndex(fa, b, f),
      reduce: (b, f) => (fa) => _reduce(fa, b, f),
      foldMapWithIndex: (M) => (f) => (fa) => _foldMapWithIndex(M)(fa, f),
      foldMap: (M) => (f) => (fa) => _foldMap(M)(fa, f),
      reduceRightWithIndex: (b, f) => (fa) => _reduceRightWithIndex(fa, b, f),
      reduceRight: (b, f) => (fa) => _reduceRight(fa, b, f),
      traverseWithIndex: (G) => (f) => (ta) => _traverseWithIndex(G)(ta, f),
      traverse: (G) => (f) => (ta) => _traverse(G)(ta, f),
      wiltWithIndex: (G) => (f) => (wa) => _wiltWithIndex(G)(wa, f),
      wilt: (G) => (f) => (wa) => _wilt(G)(wa, f),
      witherWithIndex: (G) => (f) => (wa) => _witherWithIndex(G)(wa, f),
      wither: (G) => (f) => (wa) => _wither(G)(wa, f),
      sequence
   });
};
