import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { none, some } from "./constructors";
import { isNone, isSome } from "./guards";
import {
   alt,
   alt_,
   ap,
   ap_,
   both,
   both_,
   compact,
   extend,
   filter,
   filter_,
   flatten,
   foldMap,
   foldMap_,
   map,
   map_,
   mapBoth,
   mapBoth_,
   mapEither,
   mapEither_,
   mapOption,
   mapOption_,
   partition,
   partition_,
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   separate,
   sequence,
   traverse,
   traverse_,
   unit,
   wilt,
   wilt_,
   wither,
   wither_
} from "./methods";
import type { Option, URI, V } from "./model";

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_,
   ap,
   mapBoth_,
   mapBoth
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});

export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_,
   reduceRight_,
   foldMap_,
   reduce,
   reduceRight,
   foldMap
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
   mapOption_,
   filter_,
   mapEither_,
   partition_,
   filter,
   mapOption,
   partition,
   mapEither
});

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   traverse_,
   traverse,
   sequence
});

export const Witherable: P.Witherable<[URI], V> = HKT.instance({
   wilt_,
   wither_,
   wilt,
   wither
});

export const Do: P.Do<[URI], V> = P.deriveDo(Monad);

export const getApplySemigroup = <A>(S: P.Semigroup<A>): P.Semigroup<Option<A>> => {
   const combine_ = (x: Option<A>, y: Option<A>) =>
      isSome(x) && isSome(y) ? some(S.combine_(x.value, y.value)) : none();
   return {
      combine_,
      combine: (y) => (x) => combine_(x, y)
   };
};

export const getApplyMonoid = <A>(M: P.Monoid<A>): P.Monoid<Option<A>> => ({
   ...getApplySemigroup(M),
   nat: some(M.nat)
});

export const getFirstMonoid = <A = never>(): P.Monoid<Option<A>> => ({
   combine_: (x, y) => (isNone(y) ? x : y),
   combine: (y) => (x) => (isNone(y) ? x : y),
   nat: none()
});

export const getLastMonoid = <A = never>(): P.Monoid<Option<A>> => ({
   combine_: (x, y) => (isNone(x) ? y : x),
   combine: (y) => (x) => (isNone(x) ? y : x),
   nat: none()
});

export const getMonoid = <A>(S: P.Semigroup<A>): P.Monoid<Option<A>> => {
   const combine_ = (x: Option<A>, y: Option<A>) =>
      isNone(x) ? y : isNone(y) ? x : some(S.combine_(x.value, y.value));
   return {
      combine_,
      combine: (y) => (x) => combine_(x, y),
      nat: none()
   };
};
