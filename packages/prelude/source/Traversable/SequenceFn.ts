import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";

export interface SequenceFn<F extends HKT.URIS, CF = HKT.Auto> {
   <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <
      NF extends string,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      NG extends string,
      KG,
      QG,
      WG,
      XG,
      IG,
      SG,
      RG,
      EG,
      A
   >(
      ta: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
   ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>>;
}

export interface SequenceFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <H extends HKT.URIS, CH = HKT.Auto>(A: Applicative<H, CH>): <
      NF extends string,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      NG extends string,
      KG,
      QG,
      WG,
      XG,
      IG,
      SG,
      RG,
      EG,
      NH extends string,
      KH,
      QH,
      WH,
      XH,
      IH,
      SH,
      RH,
      EH,
      A
   >(
      fgha: HKT.Kind<
         F,
         CF,
         NF,
         KF,
         QF,
         WF,
         XF,
         IF,
         SF,
         RF,
         EF,
         HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<H, CH, NH, KH, QH, WH, XH, IH, SH, RH, EH, A>>
      >
   ) => HKT.Kind<
      H,
      CH,
      NH,
      KH,
      QH,
      WH,
      XH,
      IH,
      SH,
      RH,
      EH,
      HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
   >;
}

export function implementSequence<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
      A: A;
      B: B;
      G: G;
      N: N;
      K: K;
      Q: Q;
      W: W;
      X: X;
      I: I;
      S: S;
      R: R;
      E: E;
   }) => (
      G: Applicative<HKT.UHKT<G>>
   ) => (
      ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, HKT.HKT<G, A>>
   ) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>>
) => SequenceFn<F, C>;
export function implementSequence() {
   return (i: any) => i();
}
