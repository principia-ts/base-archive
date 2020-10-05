import * as HKT from "../HKT";
import * as TC from "../typeclass-index";
import { URI, V } from "./Array";
import { append } from "./combinators";
import { empty } from "./constructors";
import {
   _alt,
   _ap,
   _chain,
   _filter,
   _filterWithIndex,
   _foldMap,
   _foldMapWithIndex,
   _map,
   _mapBoth,
   _mapEitherWithIndex,
   _mapMaybe,
   _mapMaybeWithIndex,
   _mapWithIndex,
   _partition,
   _partitionMap,
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
   alt,
   any,
   ap,
   chain,
   compact,
   extend,
   filter,
   filterWithIndex,
   foldMap,
   foldMapWithIndex,
   map,
   mapBoth,
   mapEitherWithIndex,
   mapMaybe,
   mapMaybeWithIndex,
   mapWithIndex,
   none,
   partition,
   partitionMap,
   partitionWithIndex,
   pure,
   reduce,
   reduceRight,
   reduceRightWithIndex,
   reduceWithIndex,
   separate,
   sequence,
   traverse,
   traverseWithIndex,
   unfold,
   wilt,
   wiltWithIndex,
   wither,
   witherWithIndex
} from "./methods";

export const getMonoid = <A = never>(): TC.Monoid<ReadonlyArray<A>> => ({
   concat: append,
   empty
});

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map,
   _map
});

export const FunctorWithIndex: TC.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   _mapWithIndex
});

export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   _ap,
   mapBoth,
   _mapBoth
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure,
   any
});

export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   _chain,
   chain
});

export const Alt: TC.Alt<[URI], V> = HKT.instance({
   ...Functor,
   _alt,
   alt
});

export const Alterenative: TC.Alternative<[URI], V> = HKT.instance({
   ...Applicative,
   ...Alt,
   none
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
   _filter,
   _mapMaybe: _mapMaybe,
   _partition,
   _mapEither: _partitionMap,
   filter,
   mapMaybe: mapMaybe,
   partition,
   mapEither: partitionMap
});

export const FilterableWithIndex: TC.FilterableWithIndex<[URI], V> = HKT.instance({
   ...Filterable,
   ...FunctorWithIndex,
   _filterWithIndex,
   _mapMaybeWithIndex,
   _mapEitherWithIndex,
   mapMaybeWithIndex,
   filterWithIndex,
   mapEitherWithIndex,
   _partitionWithIndex,
   partitionWithIndex
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

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   _traverse,
   traverse,
   sequence
});

export const TraversableWithIndex: TC.TraversableWithIndex<[URI], V> = HKT.instance({
   ...Traversable,
   ...FunctorWithIndex,
   ...FoldableWithIndex,
   _traverseWithIndex,
   traverseWithIndex
});

export const Witherable: TC.Witherable<[URI], V> = HKT.instance({
   ...Traversable,
   ...Compactable,
   ...Filterable,
   _wither,
   _wilt,
   wither,
   wilt
});

export const WitherableWithIndex: TC.WitherableWithIndex<[URI], V> = HKT.instance({
   ...TraversableWithIndex,
   ...FilterableWithIndex,
   ...Witherable,
   _witherWithIndex,
   _wiltWithIndex,
   witherWithIndex,
   wiltWithIndex
});

export const Unfoldable: TC.Unfoldable<[URI], V> = HKT.instance({
   unfold
});
