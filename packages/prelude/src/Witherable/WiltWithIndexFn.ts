import type { Applicative } from "../Applicative";
import type { Either } from "../Either";
import type * as HKT from "../HKT";
import type { Separated } from "../Utils";

export interface WiltWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
   <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <
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
      B2,
      NF extends string,
      KF
   >(
      f: (
         k: HKT.IndexFor<F, HKT.OrFix<"N", C, NF>, HKT.OrFix<"K", C, KF>>,
         a: A
      ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B2>>
   ) => <QF, WF, XF, IF, SF, RF, EF>(
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
   ) => HKT.Kind<
      G,
      GC,
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
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
      >
   >;
}

export interface WiltWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
   <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <
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
      A,
      B,
      B2
   >(
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
      f: (
         k: HKT.IndexFor<F, HKT.OrFix<"N", C, NF>, HKT.OrFix<"K", C, KF>>,
         a: A
      ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B2>>
   ) => HKT.Kind<
      G,
      GC,
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
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
      >
   >;
}

export function implementWiltWithIndex<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, B2, G>(_: {
      A: A;
      B: B;
      B2: B2;
      G: G;
      NF: NF;
      FK: KF;
      FQ: QF;
      FW: WF;
      FX: XF;
      FI: IF;
      FS: SF;
      FR: RF;
      FE: EF;
   }) => (
      G: Applicative<HKT.UHKT<G>>
   ) => (
      f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, NF>, HKT.OrFix<"K", C, KF>>, a: A) => HKT.HKT<G, Either<B, B2>>
   ) => (
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
   ) => HKT.HKT<
      G,
      Separated<
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
      >
   >
) => WiltWithIndexFn<F, C>;
export function implementWiltWithIndex() {
   return (i: any) => i();
}

export function implementWiltWithIndex_<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, B2, G>(_: {
      A: A;
      B: B;
      B2: B2;
      G: G;
      NF: NF;
      FK: KF;
      FQ: QF;
      FW: WF;
      FX: XF;
      FI: IF;
      FS: SF;
      FR: RF;
      FE: EF;
   }) => (
      G: Applicative<HKT.UHKT<G>>
   ) => (
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
      f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, NF>, HKT.OrFix<"K", C, KF>>, a: A) => HKT.HKT<G, Either<B, B2>>
   ) => HKT.HKT<
      G,
      Separated<
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
         HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
      >
   >
) => WiltWithIndexFn_<F, C>;
export function implementWiltWithIndex_() {
   return (i: any) => i();
}
