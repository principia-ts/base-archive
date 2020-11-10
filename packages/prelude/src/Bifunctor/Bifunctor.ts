import type { MapFn, MapFn_ } from "../Functor";
import type * as HKT from "../HKT";
import type { BimapFn, BimapFn_ } from "./BimapFn";
import type { FirstFn, FirstFn_ } from "./FirstFn";

export interface BifunctorHKT<F, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly bimap_: <E, A, G, B>(pab: HKT.HKT2<F, E, A>, f: (e: E) => G, g: (a: A) => B) => HKT.HKT2<F, G, B>;
   readonly bimap: <E, A, G, B>(f: (e: E) => G, g: (a: A) => B) => (pab: HKT.HKT2<F, E, A>) => HKT.HKT2<F, G, B>;
   readonly first_: <E, A, G>(pab: HKT.HKT2<F, E, A>, f: (e: E) => G) => HKT.HKT2<F, G, A>;
   readonly first: <E, G>(f: (e: E) => G) => <A>(pab: HKT.HKT2<F, E, A>) => HKT.HKT2<F, G, A>;
   readonly second_: <E, A, B>(pab: HKT.HKT2<F, E, A>, f: (a: A) => B) => HKT.HKT2<F, E, B>;
   readonly second: <A, B>(f: (a: A) => B) => <E>(pab: HKT.HKT2<F, E, A>) => HKT.HKT2<F, E, B>;
}

export interface Bifunctor<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly bimap_: BimapFn_<F, C>;
   readonly bimap: BimapFn<F, C>;
   readonly first_: FirstFn_<F, C>;
   readonly first: FirstFn<F, C>;
   readonly second_: MapFn_<F, C>;
   readonly second: MapFn<F, C>;
}

export interface Bifunctor2<F extends HKT.URIS2, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly bimap_: <E, A, G, B>(pab: HKT.Kind2<F, C, E, A>, f: (e: E) => G, g: (a: A) => B) => HKT.Kind2<F, C, G, B>;
   readonly bimap: <E, A, G, B>(
      f: (e: E) => G,
      g: (a: A) => B
   ) => (pab: HKT.Kind2<F, C, E, A>) => HKT.Kind2<F, C, G, B>;
   readonly first_: <E, A, G>(pab: HKT.Kind2<F, C, E, A>, f: (e: E) => G) => HKT.Kind2<F, C, G, A>;
   readonly first: <E, G>(f: (e: E) => G) => <A>(pab: HKT.Kind2<F, C, E, A>) => HKT.Kind2<F, C, G, A>;
   readonly second_: <E, A, B>(pab: HKT.Kind2<F, C, E, A>, f: (a: A) => B) => HKT.Kind2<F, C, E, B>;
   readonly second: <A, B>(f: (a: A) => B) => <E>(pab: HKT.Kind2<F, C, E, A>) => HKT.Kind2<F, C, E, B>;
}

export interface Bifunctor3<F extends HKT.URIS3, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly bimap_: <R, E, A, G, B>(
      pab: HKT.Kind3<F, C, R, E, A>,
      f: (e: E) => G,
      g: (a: A) => B
   ) => HKT.Kind3<F, C, R, G, B>;
   readonly bimap: <E, A, G, B>(
      f: (e: E) => G,
      g: (a: A) => B
   ) => <R>(pab: HKT.Kind3<F, C, R, E, A>) => HKT.Kind3<F, C, R, G, B>;
   readonly first_: <R, E, A, G>(pab: HKT.Kind3<F, C, R, E, A>, f: (e: E) => G) => HKT.Kind3<F, C, R, G, A>;
   readonly first: <E, G>(f: (e: E) => G) => <R, A>(pab: HKT.Kind3<F, C, R, E, A>) => HKT.Kind3<F, C, R, G, A>;
   readonly second_: <R, E, A, B>(pab: HKT.Kind3<F, C, R, E, A>, f: (a: A) => B) => HKT.Kind3<F, C, R, E, B>;
   readonly second: <A, B>(f: (a: A) => B) => <R, E>(pab: HKT.Kind3<F, C, R, E, A>) => HKT.Kind3<F, C, R, E, B>;
}

export interface Bifunctor4<F extends HKT.URIS4, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly bimap_: <S, R, E, A, G, B>(
      pab: HKT.Kind4<F, C, S, R, E, A>,
      f: (e: E) => G,
      g: (a: A) => B
   ) => HKT.Kind4<F, C, S, R, G, B>;
   readonly bimap: <E, A, G, B>(
      f: (e: E) => G,
      g: (a: A) => B
   ) => <S, R>(pab: HKT.Kind4<F, C, S, R, E, A>) => HKT.Kind4<F, C, S, R, G, B>;
   readonly first_: <S, R, E, A, G>(pab: HKT.Kind4<F, C, S, R, E, A>, f: (e: E) => G) => HKT.Kind4<F, C, S, R, G, A>;
   readonly first: <E, G>(f: (e: E) => G) => <S, R, A>(pab: HKT.Kind4<F, C, S, R, E, A>) => HKT.Kind4<F, C, S, R, G, A>;
   readonly second_: <S, R, E, A, B>(pab: HKT.Kind4<F, C, S, R, E, A>, f: (a: A) => B) => HKT.Kind4<F, C, S, R, E, B>;
   readonly second: <A, B>(
      f: (a: A) => B
   ) => <S, R, E>(pab: HKT.Kind4<F, C, S, R, E, A>) => HKT.Kind4<F, C, S, R, E, B>;
}
