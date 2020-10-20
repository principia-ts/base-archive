import { pipe } from "../Function";
import type { Functor, Functor1, Functor2, Functor3, Functor4, FunctorComposition, FunctorHKT } from "../Functor";
import { getCovariantFunctorComposition } from "../Functor";
import * as HKT from "../HKT";
import type { Unit, Unit1, Unit2, Unit3, Unit4, UnitComposition, UnitHKT } from "../Unit";
import type { BothFn, BothFn_, BothFnComposition, BothFnComposition_ } from "./BothFn";

export interface ApplicativeHKT<F, TC = HKT.Auto> extends FunctorHKT<F, TC>, UnitHKT<F, TC> {
   readonly both_: <A, B>(fa: HKT.HKT<F, A>, fb: HKT.HKT<F, B>) => HKT.HKT<F, readonly [A, B]>;
   readonly both: <B>(fb: HKT.HKT<F, B>) => <A>(fa: HKT.HKT<F, A>) => HKT.HKT<F, readonly [A, B]>;
}

export interface Applicative<F extends HKT.URIS, TC = HKT.Auto> extends Functor<F, TC>, Unit<F, TC> {
   readonly both_: BothFn_<F, TC>;
   readonly both: BothFn<F, TC>;
}

export interface Applicative1<F extends HKT.URIS1, TC = HKT.Auto> extends Functor1<F, TC>, Unit1<F, TC> {
   readonly both_: <A, B>(fa: HKT.Kind1<F, TC, A>, fb: HKT.Kind1<F, TC, B>) => HKT.Kind1<F, TC, readonly [A, B]>;
   readonly both: <B>(fb: HKT.Kind1<F, TC, B>) => <A>(fa: HKT.Kind1<F, TC, A>) => HKT.Kind1<F, TC, readonly [A, B]>;
}

export interface Applicative2<F extends HKT.URIS2, TC = HKT.Auto> extends Functor2<F, TC>, Unit2<F, TC> {
   readonly both_: <E, A, G, B>(
      fa: HKT.Kind2<F, TC, E, A>,
      fb: HKT.Kind2<F, TC, HKT.Intro2<TC, "E", E, G>, B>
   ) => HKT.Kind2<F, TC, HKT.Mix2<TC, "E", [E, G]>, readonly [A, B]>;
   readonly both: <G, B>(
      fb: HKT.Kind2<F, TC, G, B>
   ) => <E, A>(
      fa: HKT.Kind2<F, TC, HKT.Intro2<TC, "E", G, E>, A>
   ) => HKT.Kind2<F, TC, HKT.Mix2<TC, "E", [G, E]>, readonly [A, B]>;
}

export interface Applicative3<F extends HKT.URIS3, TC = HKT.Auto> extends Functor3<F, TC>, Unit3<F, TC> {
   readonly both_: <R, E, A, Q, G, B>(
      fa: HKT.Kind3<F, TC, R, E, A>,
      fb: HKT.Kind3<F, TC, HKT.Intro3<TC, "R", R, Q>, HKT.Intro3<TC, "E", E, G>, B>
   ) => HKT.Kind3<F, TC, HKT.Mix3<TC, "R", [R, Q]>, HKT.Mix3<TC, "E", [E, G]>, readonly [A, B]>;
   readonly both: <Q, G, B>(
      fb: HKT.Kind3<F, TC, Q, G, B>
   ) => <R, E, A>(
      fa: HKT.Kind3<F, TC, HKT.Intro3<TC, "R", Q, R>, HKT.Intro3<TC, "E", G, E>, A>
   ) => HKT.Kind3<F, TC, HKT.Mix3<TC, "R", [Q, R]>, HKT.Mix3<TC, "E", [G, E]>, readonly [A, B]>;
}

export interface Applicative4<F extends HKT.URIS4, TC = HKT.Auto> extends Functor4<F, TC>, Unit4<F, TC> {
   readonly both_: <S, R, E, A, U, Q, G, B>(
      fa: HKT.Kind4<F, TC, S, R, E, A>,
      fb: HKT.Kind4<F, TC, HKT.Intro4<TC, "S", S, U>, HKT.Intro4<TC, "R", R, Q>, HKT.Intro4<TC, "E", E, G>, B>
   ) => HKT.Kind4<
      F,
      TC,
      HKT.Mix4<TC, "S", [S, U]>,
      HKT.Mix4<TC, "R", [R, Q]>,
      HKT.Mix4<TC, "E", [E, G]>,
      readonly [A, B]
   >;
   readonly both: <U, Q, G, B>(
      fb: HKT.Kind4<F, TC, U, Q, G, B>
   ) => <S, R, E, A>(
      fa: HKT.Kind4<F, TC, HKT.Intro4<TC, "S", U, S>, HKT.Intro4<TC, "R", Q, R>, HKT.Intro4<TC, "E", G, E>, A>
   ) => HKT.Kind4<
      F,
      TC,
      HKT.Mix4<TC, "S", [U, S]>,
      HKT.Mix4<TC, "R", [Q, R]>,
      HKT.Mix4<TC, "E", [G, E]>,
      readonly [A, B]
   >;
}

export interface ApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>
   extends FunctorComposition<F, G, TCF, TCG>,
      UnitComposition<F, G, TCF, TCG> {
   readonly both_: BothFnComposition_<F, G, TCF, TCG>;
   readonly both: BothFnComposition<F, G, TCF, TCG>;
}

export function getApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>(
   F: Applicative<F, TCF>,
   G: Applicative<G, TCG>
): ApplicativeComposition<F, G, TCF, TCG>;
export function getApplicativeComposition<F, G>(F: Applicative<HKT.UHKT<F>>, G: Applicative<HKT.UHKT<G>>) {
   const both_: BothFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, fgb) =>
      pipe(
         F.both_(fga, fgb),
         F.map(([ga, gb]) => G.both_(ga, gb))
      );
   return HKT.instance<ApplicativeComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      ...getCovariantFunctorComposition(F, G),
      unit: () => F.map_(F.unit(), G.unit),
      both_,
      both: (fgb) => (fga) => both_(fga, fgb)
   });
}
