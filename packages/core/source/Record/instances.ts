import { Eq, fromEquals } from "../Eq";
import { pipe } from "../Function";
import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import { empty } from "./constructors";
import { isSubrecord } from "./guards";
import {
   _filter,
   _filterWithIndex,
   _foldMap,
   _foldMapWithIndex,
   _map,
   _mapEither,
   _mapEitherWithIndex,
   _mapMaybe,
   _mapMaybeWithIndex,
   _mapWithIndex,
   _partition,
   _partitionWithIndex,
   _reduce,
   _reduceRight,
   _reduceRightWithIndex,
   _reduceWithIndex,
   _traverse,
   _traverseWithIndex,
   _wilt,
   _wiltWithIndex,
   _wither,
   _witherWithIndex,
   compact,
   filter,
   filterWithIndex,
   foldMap,
   foldMapWithIndex,
   map,
   mapEither,
   mapEitherWithIndex,
   mapMaybe,
   mapMaybeWithIndex,
   mapWithIndex,
   partition,
   partitionWithIndex,
   reduce,
   reduceRight,
   reduceRightWithIndex,
   reduceWithIndex,
   separate,
   sequence,
   traverse,
   traverseWithIndex,
   wilt,
   wiltWithIndex,
   wither,
   witherWithIndex
} from "./methods";
import { ReadonlyRecord, URI, V } from "./Record";

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export const getEq: {
   <N extends string, A>(E: Eq<A>): Eq<ReadonlyRecord<N, A>>;
   <A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>>;
} = <A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>> => {
   const isSubrecordE = isSubrecord(E);
   return fromEquals((x) => (y) => isSubrecordE(x)(y) && isSubrecordE(y)(x));
};

export const getMonoid: {
   <N extends string, A>(S: TC.Semigroup<A>): TC.Monoid<ReadonlyRecord<N, A>>;
   <A>(S: TC.Semigroup<A>): TC.Monoid<ReadonlyRecord<string, A>>;
} = <A>(S: TC.Semigroup<A>): TC.Monoid<ReadonlyRecord<string, A>> => ({
   concat: (x) => (y) => {
      if (x === empty) {
         return y;
      }
      if (y === empty) {
         return x;
      }
      const keys = Object.keys(y);
      const len = keys.length;
      if (len === 0) {
         return x;
      }
      const r: Record<string, A> = Object.assign({}, x);
      for (let i = 0; i < len; i++) {
         const k = keys[i];
         r[k] = _hasOwnProperty.call(x, k) ? S.concat(x[k])(y[k]) : y[k];
      }
      return r;
   },
   empty
});

export const fromFoldableMap = <B, F extends HKT.URIS, C = HKT.Auto>(
   S: TC.Semigroup<B>,
   F: TC.Foldable<F, C>
) => <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, N extends string>(
   fa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
   f: (a: A) => readonly [N, B]
): ReadonlyRecord<N, B> =>
   pipe(
      fa,
      F.reduce<A, Record<N, B>>({} as any, (r, a) => {
         const [k, b] = f(a);
         r[k] = _hasOwnProperty.call(r, k) ? S.concat(r[k])(b) : b;
         return r;
      })
   );

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map,
   _map
});

export const FunctorWithIndex: TC.FunctorWithIndex<[URI], V> = HKT.instance({
   ...Functor,
   mapWithIndex,
   _mapWithIndex
});

export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   _reduce,
   _foldMap,
   _reduceRight,
   reduce,
   foldMap,
   reduceRight
});

export const FoldableWithIndex: TC.FoldableWithIndex<[URI], V> = HKT.instance({
   ...Foldable,
   _reduceWithIndex,
   _foldMapWithIndex,
   _reduceRightWithIndex,
   reduceWithIndex,
   foldMapWithIndex,
   reduceRightWithIndex
});

export const Compactable: TC.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});

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

export const FilterableWithIndex: TC.FilterableWithIndex<[URI], V> = HKT.instance({
   ...Filterable,
   ...FunctorWithIndex,
   _filterWithIndex,
   _mapMaybeWithIndex,
   _partitionWithIndex,
   _mapEitherWithIndex,
   filterWithIndex,
   mapMaybeWithIndex,
   partitionWithIndex,
   mapEitherWithIndex
});

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   _traverse,
   traverse,
   sequence
});

export const TraversableWithIndex: TC.TraversableWithIndex<[URI], V> = HKT.instance({
   ...FunctorWithIndex,
   ...FoldableWithIndex,
   ...Traversable,
   _traverseWithIndex,
   traverseWithIndex
});

export const Witherable: TC.Witherable<[URI], V> = HKT.instance({
   ...Traversable,
   ...Filterable,
   _wither,
   _wilt,
   wither,
   wilt
});

export const WitherableWithIndex: TC.WitherableWithIndex<[URI], V> = HKT.instance({
   ...Witherable,
   ...FilterableWithIndex,
   ...TraversableWithIndex,
   _wiltWithIndex,
   _witherWithIndex,
   witherWithIndex,
   wiltWithIndex
});
