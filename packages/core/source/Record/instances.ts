import type { Eq } from "../Eq";
import { fromEquals } from "../Eq";
import { pipe } from "../Function";
import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import { empty } from "./constructors";
import { isSubrecord } from "./guards";
import {
   compact,
   filter,
   filter_,
   filterWithIndex,
   filterWithIndex_,
   foldMap,
   foldMap_,
   foldMapWithIndex,
   foldMapWithIndex_,
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
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   reduceRightWithIndex,
   reduceRightWithIndex_,
   reduceWithIndex,
   reduceWithIndex_,
   separate,
   sequence,
   traverse,
   traverse_,
   traverseWithIndex,
   traverseWithIndex_,
   wilt,
   wilt_,
   wiltWithIndex,
   wiltWithIndex_,
   wither,
   wither_,
   witherWithIndex,
   witherWithIndex_
} from "./methods";
import type { ReadonlyRecord, URI, V } from "./Record";

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

export const fromFoldableMap = <B, F extends HKT.URIS, C = HKT.Auto>(S: TC.Semigroup<B>, F: TC.Foldable<F, C>) => <
   NF extends string,
   KF,
   QF,
   WF,
   XF,
   IF,
   SF,
   RF,
   EF,
   A,
   N extends string
>(
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
   map_: map_
});

export const FunctorWithIndex: TC.FunctorWithIndex<[URI], V> = HKT.instance({
   ...Functor,
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});

export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   foldMap_: foldMap_,
   reduceRight_: reduceRight_,
   reduce,
   foldMap,
   reduceRight
});

export const FoldableWithIndex: TC.FoldableWithIndex<[URI], V> = HKT.instance({
   ...Foldable,
   reduceWithIndex_: reduceWithIndex_,
   foldMapWithIndex_: foldMapWithIndex_,
   reduceRightWithIndex_: reduceRightWithIndex_,
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
   filter_: filter_,
   mapOption_: mapOption_,
   partition_: partition_,
   mapEither_: mapEither_,
   filter,
   mapOption,
   partition,
   mapEither
});

export const FilterableWithIndex: TC.FilterableWithIndex<[URI], V> = HKT.instance({
   ...Filterable,
   ...FunctorWithIndex,
   filterWithIndex_: filterWithIndex_,
   mapOptionWithIndex_: mapOptionWithIndex_,
   partitionWithIndex_: partitionWithIndex_,
   mapEitherWithIndex_: mapEitherWithIndex_,
   filterWithIndex,
   mapOptionWithIndex,
   partitionWithIndex,
   mapEitherWithIndex
});

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   traverse_: traverse_,
   traverse,
   sequence
});

export const TraversableWithIndex: TC.TraversableWithIndex<[URI], V> = HKT.instance({
   ...FunctorWithIndex,
   ...FoldableWithIndex,
   ...Traversable,
   traverseWithIndex_: traverseWithIndex_,
   traverseWithIndex
});

export const Witherable: TC.Witherable<[URI], V> = HKT.instance({
   ...Traversable,
   ...Filterable,
   wither_: wither_,
   wilt_: wilt_,
   wither,
   wilt
});

export const WitherableWithIndex: TC.WitherableWithIndex<[URI], V> = HKT.instance({
   ...Witherable,
   ...FilterableWithIndex,
   ...TraversableWithIndex,
   wiltWithIndex_: wiltWithIndex_,
   witherWithIndex_: witherWithIndex_,
   witherWithIndex,
   wiltWithIndex
});
