import { constant } from "../Function";
import type { Functor, Functor1, Functor2, Functor3, Functor4 } from "../Functor";
import type * as HKT from "../HKT";
import type { Unit, Unit1, Unit2, Unit3, Unit4 } from "../Unit";

export interface PureFn<F extends HKT.URIS, C = HKT.Auto> {
   <
      A,
      N extends string = HKT.Initial<C, "N">,
      K = HKT.Initial<C, "K">,
      Q = HKT.Initial<C, "Q">,
      W = HKT.Initial<C, "W">,
      X = HKT.Initial<C, "X">,
      I = HKT.Initial<C, "I">,
      S = HKT.Initial<C, "S">,
      R = HKT.Initial<C, "R">,
      E = HKT.Initial<C, "E">
   >(
      a: A
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>;
}

export interface PureFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <
      A,
      N extends string = HKT.Initial<CF, "N">,
      K = HKT.Initial<CF, "K">,
      Q = HKT.Initial<CF, "Q">,
      W = HKT.Initial<CF, "W">,
      X = HKT.Initial<CF, "X">,
      I = HKT.Initial<CF, "I">,
      S = HKT.Initial<CF, "S">,
      R = HKT.Initial<CF, "R">,
      E = HKT.Initial<CF, "E">
   >(
      a: A
   ): HKT.Kind<
      F,
      CF,
      N,
      K,
      Q,
      W,
      X,
      I,
      S,
      R,
      E,
      HKT.Kind<
         G,
         CG,
         HKT.Initial<CG, "N">,
         HKT.Initial<CG, "K">,
         HKT.Initial<CG, "Q">,
         HKT.Initial<CG, "W">,
         HKT.Initial<CG, "X">,
         HKT.Initial<CG, "I">,
         HKT.Initial<CG, "S">,
         HKT.Initial<CG, "R">,
         HKT.Initial<CG, "E">,
         A
      >
   >;
}

export function pureF<F extends HKT.URIS, TC = HKT.Auto>(F: Functor<F, TC> & Unit<F, TC>): PureFn<F, TC>;
export function pureF<F extends HKT.URIS1, TC = HKT.Auto>(
   F: Functor1<F, TC> & Unit1<F, TC>
): <A>(a: A) => HKT.Kind1<F, TC, A>;
export function pureF<F extends HKT.URIS2, TC = HKT.Auto>(
   F: Functor2<F, TC> & Unit2<F, TC>
): <A, E = HKT.Initial2<TC, "E">>(a: A) => HKT.Kind2<F, TC, E, A>;
export function pureF<F extends HKT.URIS3, TC = HKT.Auto>(
   F: Functor3<F, TC> & Unit3<F, TC>
): <A, R = HKT.Initial3<TC, "R">, E = HKT.Initial3<TC, "E">>(a: A) => HKT.Kind3<F, TC, R, E, A>;
export function pureF<F extends HKT.URIS4, TC = HKT.Auto>(
   F: Functor4<F, TC> & Unit4<F, TC>
): <A, S = HKT.Initial4<TC, "S">, R = HKT.Initial4<TC, "R">, E = HKT.Initial4<TC, "E">>(
   a: A
) => HKT.Kind4<F, TC, S, R, E, A>;
export function pureF<F>(F: Functor<HKT.UHKT<F>> & Unit<HKT.UHKT<F>>): PureFn<HKT.UHKT<F>> {
   return (a) => F.map_(F.unit(), constant(a));
}
