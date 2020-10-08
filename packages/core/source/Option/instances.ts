import * as HKT from "../HKT";
import * as TC from "../typeclass-index";
import { none, some } from "./constructors";
import { isNone, isSome } from "./guards";
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
   pure,
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   separate,
   sequence,
   traverse,
   traverse_,
   wilt,
   wilt_,
   wither,
   wither_
} from "./methods";
import type { Option, URI, V } from "./Option";

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   pure,
   ap,
   ap_: ap_,
   mapBoth,
   mapBoth_: mapBoth_
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

export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   reduceRight_: reduceRight_,
   foldMap_: foldMap_,
   reduce,
   reduceRight,
   foldMap
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
   mapOption_: mapOption_,
   filter_: filter_,
   mapEither_: mapEither_,
   partition_: partition_,
   filter,
   mapOption,
   partition,
   mapEither
});

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   traverse_: traverse_,
   traverse,
   sequence
});

export const Witherable: TC.Witherable<[URI], V> = HKT.instance({
   ...Traversable,
   ...Filterable,
   wilt_: wilt_,
   wither_: wither_,
   wilt,
   wither
});

export const Do: TC.Do<[URI], V> = TC.deriveDo(Monad);

export const getApplySemigroup = <A>(S: TC.Semigroup<A>): TC.Semigroup<Option<A>> => ({
   concat: (y) => (x) => (isSome(x) && isSome(y) ? some(S.concat(x.value)(y.value)) : none())
});

export const getApplyMonoid = <A>(M: TC.Monoid<A>): TC.Monoid<Option<A>> => ({
   ...getApplySemigroup(M),
   empty: some(M.empty)
});

export const getFirstMonoid = <A = never>(): TC.Monoid<Option<A>> => ({
   concat: (y) => (x) => (isNone(y) ? x : y),
   empty: none()
});

export const getLastMonoid = <A = never>(): TC.Monoid<Option<A>> => ({
   concat: (y) => (x) => (isNone(x) ? y : x),
   empty: none()
});

export const getMonoid = <A>(S: TC.Semigroup<A>): TC.Monoid<Option<A>> => ({
   concat: (y) => (x) => (isNone(x) ? y : isNone(y) ? x : some(S.concat(x.value)(y.value))),
   empty: none()
});
