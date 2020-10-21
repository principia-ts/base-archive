import type * as P from "@principia/prelude";
import { makeMonoid } from "@principia/prelude";
import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";
import * as HKT from "@principia/prelude/HKT";

import { append_ } from "./combinators";
import { empty } from "./constructors";
import {
   alt,
   alt_,
   ap,
   ap_,
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
   unit,
   wilt,
   wilt_,
   wiltWithIndex,
   wiltWithIndex_,
   wither,
   wither_,
   witherWithIndex,
   witherWithIndex_,
   zip,
   zip_,
   zipWith,
   zipWith_
} from "./methods";
import type { URI, V } from "./model";

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const FunctorWithIndex: P.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   ap_,
   mapBoth: zipWith,
   mapBoth_: zipWith_
});

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_: zip_,
   both: zip,
   unit
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   flatten,
   unit
});

export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});

export const Alterenative: P.Alternative<[URI], V> = HKT.instance({
   ...Applicative,
   ...Alt,
   empty
});

export const Extend: P.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend
});

export const Compactable: P.Compactable<[URI], V> = HKT.instance({
   compact,
   separate
});

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

export const FilterableWithIndex: P.FilterableWithIndex<[URI], V> = HKT.instance({
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

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   foldMap_: foldMap_,
   reduceRight_: reduceRight_,
   reduce,
   foldMap,
   reduceRight
});

export const FoldableWithIndex: P.FoldableWithIndex<[URI], V> = HKT.instance({
   ...Foldable,
   reduceWithIndex_: reduceWithIndex_,
   foldMapWithIndex_: foldMapWithIndex_,
   reduceRightWithIndex_: reduceRightWithIndex_,
   reduceWithIndex,
   foldMapWithIndex,
   reduceRightWithIndex
});

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   traverse_: traverse_,
   traverse,
   sequence
});

export const TraversableWithIndex: P.TraversableWithIndex<[URI], V> = HKT.instance({
   ...FunctorWithIndex,
   traverseWithIndex_: traverseWithIndex_,
   traverseWithIndex
});

export const Witherable: P.Witherable<[URI], V> = HKT.instance({
   wither_: wither_,
   wilt_: wilt_,
   wither,
   wilt
});

export const WitherableWithIndex: P.WitherableWithIndex<[URI], V> = HKT.instance({
   witherWithIndex_: witherWithIndex_,
   wiltWithIndex_: wiltWithIndex_,
   witherWithIndex,
   wiltWithIndex
});

export const Unfoldable: P.Unfoldable<[URI], V> = HKT.instance({
   unfold
});

export const getEq = <A>(E: Eq<A>): Eq<ReadonlyArray<A>> =>
   fromEquals((xs, ys) => xs === ys || (xs.length === ys.length && xs.every((x, i) => E.equals_(x, ys[i]))));

export const getMonoid = <A = never>(): P.Monoid<ReadonlyArray<A>> => makeMonoid(append_, empty());
