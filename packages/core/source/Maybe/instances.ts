import * as A from "../Array";
import { identity } from "../Function";
import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import { just, nothing } from "./constructors";
import { apS, bindS, bindToS, letS } from "./do";
import { isJust, isNothing } from "./guards";
import type { Maybe, URI, V } from "./Maybe";
import {
   _alt,
   _ap,
   _chain,
   _filter,
   _foldMap,
   _map,
   _mapBoth,
   _mapEither,
   _mapMaybe,
   _partition,
   _reduce,
   _reduceRight,
   _traverse,
   _wilt,
   _wither,
   alt,
   any,
   ap,
   chain,
   compact,
   extend,
   filter,
   foldMap,
   map,
   mapBoth,
   mapEither,
   mapMaybe,
   partition,
   pure,
   reduce,
   reduceRight,
   separate,
   sequence,
   traverse,
   wilt,
   wither
} from "./methods";

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map,
   _map
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   pure,
   ap,
   _ap,
   mapBoth,
   _mapBoth,
   any
});

export const mapN: TC.MapNF<[URI], V> = (f) => (fas) => {
   const as = A.sequence(Applicative)(fas);
   if (as._tag === "Nothing") {
      return nothing();
   }
   return just(f(as.value as any));
};

export const tuple: TC.TupleF<[URI], V> = mapN(identity);

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

export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   _reduce,
   _reduceRight,
   _foldMap,
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
   _mapMaybe,
   _filter,
   _mapEither,
   _partition,
   filter,
   mapMaybe,
   partition,
   mapEither
});

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   _traverse,
   traverse,
   sequence
});

export const Witherable: TC.Witherable<[URI], V> = HKT.instance({
   ...Traversable,
   ...Filterable,
   _wilt,
   _wither,
   wilt,
   wither
});

export const ApplicativeDo: TC.ApplicativeDo<[URI], V> = HKT.instance({
   ...Applicative,
   bindS,
   bindToS,
   apS,
   letS
});

export const getApplySemigroup = <A>(S: TC.Semigroup<A>): TC.Semigroup<Maybe<A>> => ({
   concat: (y) => (x) => (isJust(x) && isJust(y) ? just(S.concat(x.value)(y.value)) : nothing())
});

export const getApplyMonoid = <A>(M: TC.Monoid<A>): TC.Monoid<Maybe<A>> => ({
   ...getApplySemigroup(M),
   empty: just(M.empty)
});

export const getFirstMonoid = <A = never>(): TC.Monoid<Maybe<A>> => ({
   concat: (y) => (x) => (isNothing(y) ? x : y),
   empty: nothing()
});

export const getLastMonoid = <A = never>(): TC.Monoid<Maybe<A>> => ({
   concat: (y) => (x) => (isNothing(x) ? y : x),
   empty: nothing()
});

export const getMonoid = <A>(S: TC.Semigroup<A>): TC.Monoid<Maybe<A>> => ({
   concat: (y) => (x) => (isNothing(x) ? y : isNothing(y) ? x : just(S.concat(x.value)(y.value))),
   empty: nothing()
});
