import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import type { URI, V } from "./Array";
import { append } from "./combinators";
import { empty } from "./constructors";
import {
   alt,
   alt_,
   ap,
   ap_,
   chain,
   chain_,
   compact,
   extend,
   filter,
   filter_,
   filterWithIndex,
   filterWithIndex_,
   flatten,
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
   pure,
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
   unfold,
   wilt,
   wilt_,
   wiltWithIndex,
   wiltWithIndex_,
   wither,
   wither_,
   witherWithIndex,
   witherWithIndex_,
   zipWith,
   zipWith_
} from "./methods";

export const getMonoid = <A = never>(): TC.Monoid<ReadonlyArray<A>> => ({
   concat: append,
   empty: empty()
});

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const FunctorWithIndex: TC.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});

export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   ap_: ap_,
   mapBoth: zipWith,
   mapBoth_: zipWith_
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure
});

export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   chain_: chain_,
   chain,
   flatten
});

export const Alt: TC.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_: alt_,
   alt
});

export const Alterenative: TC.Alternative<[URI], V> = HKT.instance({
   ...Applicative,
   ...Alt,
   none: empty
});

export const Extend: TC.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend
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
   mapEitherWithIndex_: mapEitherWithIndex_,
   mapOptionWithIndex,
   filterWithIndex,
   mapEitherWithIndex,
   partitionWithIndex_: partitionWithIndex_,
   partitionWithIndex
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

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   traverse_: traverse_,
   traverse,
   sequence
});

export const TraversableWithIndex: TC.TraversableWithIndex<[URI], V> = HKT.instance({
   ...Traversable,
   ...FunctorWithIndex,
   ...FoldableWithIndex,
   traverseWithIndex_: traverseWithIndex_,
   traverseWithIndex
});

export const Witherable: TC.Witherable<[URI], V> = HKT.instance({
   ...Traversable,
   ...Compactable,
   ...Filterable,
   wither_: wither_,
   wilt_: wilt_,
   wither,
   wilt
});

export const WitherableWithIndex: TC.WitherableWithIndex<[URI], V> = HKT.instance({
   ...TraversableWithIndex,
   ...FilterableWithIndex,
   ...Witherable,
   witherWithIndex_: witherWithIndex_,
   wiltWithIndex_: wiltWithIndex_,
   witherWithIndex,
   wiltWithIndex
});

export const Unfoldable: TC.Unfoldable<[URI], V> = HKT.instance({
   unfold
});
