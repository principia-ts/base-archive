import type { Applicative } from "../Applicative";
import type { Either } from "../Either";
import type * as HKT from "../HKT";
import type { Separated } from "../Utils";

export interface WiltFn<F extends HKT.URIS, C = HKT.Auto> {
   <G extends HKT.URIS, CG = HKT.Auto>(F: Applicative<G, CG>): <
      NG extends string,
      KG,
      QG,
      WG,
      XG,
      IG,
      SG,
      RG,
      EG,
      A,
      B,
      B1
   >(
      f: (a: A) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B1>>
   ) => <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF>(
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
   ) => HKT.Kind<
      G,
      CG,
      NG,
      KG,
      QG,
      WG,
      XG,
      IG,
      SG,
      RG,
      EG,
      Separated<
         HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>,
         HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B1>
      >
   >;
}

export interface WiltFn_<F extends HKT.URIS, C = HKT.Auto> {
   <G extends HKT.URIS, CG = HKT.Auto>(F: Applicative<G, CG>): <
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
      B1,
      A,
      B
   >(
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
      f: (a: A) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B1>>
   ) => HKT.Kind<
      G,
      CG,
      NG,
      KG,
      QG,
      WG,
      XG,
      IG,
      SG,
      RG,
      EG,
      Separated<
         HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>,
         HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B1>
      >
   >;
}

export function implementWilt<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, B1, G>(_: {
      A: A;
      B: B;
      B1: B1;
      G: G;
      NF: NF;
      KF: KF;
      QF: QF;
      WF: WF;
      XF: XF;
      IF: IF;
      SF: SF;
      RF: RF;
      EF: EF;
   }) => (
      G: Applicative<HKT.UHKT<G>>
   ) => (
      f: (a: A) => HKT.HKT<G, Either<B, B1>>
   ) => (
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
   ) => HKT.HKT<
      G,
      Separated<
         HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>,
         HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B1>
      >
   >
) => WiltFn<F, C>;
export function implementWilt() {
   return (i: any) => i();
}
