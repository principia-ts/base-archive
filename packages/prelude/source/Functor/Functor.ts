import * as HKT from "../HKT";
import type { MapFn, MapFn_, MapFnComposition, MapFnComposition_ } from "./MapFn";

export interface FunctorHKT<F, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly map: <A, B>(f: (a: A) => B) => (fa: HKT.HKT<F, A>) => HKT.HKT<F, B>;
   readonly map_: <A, B>(fa: HKT.HKT<F, A>, f: (a: A) => B) => HKT.HKT<F, B>;
}

export interface Functor<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly map: MapFn<F, C>;
   readonly map_: MapFn_<F, C>;
}

export interface Functor1<F extends HKT.URIS1, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly map: <A, B>(f: (a: A) => B) => (fa: HKT.Kind1<F, C, A>) => HKT.Kind1<F, C, B>;
   readonly map_: <A, B>(fa: HKT.Kind1<F, C, A>, f: (a: A) => B) => HKT.Kind1<F, C, B>;
}

export interface Functor2<F extends HKT.URIS2, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly map: <A, B>(f: (a: A) => B) => <E>(fa: HKT.Kind2<F, C, E, A>) => HKT.Kind2<F, C, E, B>;
   readonly map_: <E, A, B>(fa: HKT.Kind2<F, C, E, A>, f: (a: A) => B) => HKT.Kind2<F, C, E, B>;
}
export interface Functor3<F extends HKT.URIS3, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly map: <A, B>(f: (a: A) => B) => <R, E>(fa: HKT.Kind3<F, C, R, E, A>) => HKT.Kind3<F, C, R, E, B>;
   readonly map_: <R, E, A, B>(fa: HKT.Kind3<F, C, R, E, A>, f: (a: A) => B) => HKT.Kind3<F, C, R, E, B>;
}
export interface Functor4<F extends HKT.URIS4, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly map: <A, B>(f: (a: A) => B) => <S, R, E>(fa: HKT.Kind4<F, C, S, R, E, A>) => HKT.Kind4<F, C, S, R, E, B>;
   readonly map_: <S, R, E, A, B>(fa: HKT.Kind4<F, C, S, R, E, A>, f: (a: A) => B) => HKT.Kind4<F, C, S, R, E, B>;
}

export interface FunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
   extends HKT.CompositionBase2<F, G, CF, CG> {
   readonly map: MapFnComposition<F, G, CF, CG>;
   readonly map_: MapFnComposition_<F, G, CF, CG>;
}

export function getCovariantFunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
   F: Functor<F, CF>,
   G: Functor<G, CG>
): FunctorComposition<F, G, CF, CG>;
export function getCovariantFunctorComposition<F, G>(F: Functor<HKT.UHKT<F>>, G: Functor<HKT.UHKT<G>>) {
   const map_ = <A, B>(fga: HKT.HKT<F, HKT.HKT<G, A>>, f: (a: A) => B): HKT.HKT<F, HKT.HKT<G, B>> =>
      F.map_(fga, G.map(f));
   return HKT.instance<FunctorComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      map: (f) => (fga) => map_(fga, f),
      map_
   });
}
