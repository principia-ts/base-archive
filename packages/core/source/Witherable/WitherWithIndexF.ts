import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";
import type { Option } from "../Option";

export interface WitherWithIndexF<F extends HKT.URIS, C = HKT.Auto> {
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
      NF extends string,
      KF
   >(
      f: (
         k: HKT.IndexFor<F, HKT.OrFix<"N", C, NF>, HKT.OrFix<"K", C, KF>>,
         a: A
      ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
   ) => <QF, WF, XF, IF, SF, RF, EF>(
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
   ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>;
}

export interface UC_WitherWithIndexF<F extends HKT.URIS, C = HKT.Auto> {
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
      B
   >(
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
      f: (
         k: HKT.IndexFor<F, HKT.OrFix<"N", C, NF>, HKT.OrFix<"K", C, KF>>,
         a: A
      ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
   ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>;
}

export function implementWitherWithIndex<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, G>(_: {
      A: A;
      B: B;
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
      f: (i: HKT.IndexFor<F, HKT.OrFix<"N", F, NF>, HKT.OrFix<"K", F, KF>>, a: A) => HKT.HKT<G, Option<B>>
   ) => (
      wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
   ) => HKT.HKT<G, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => WitherWithIndexF<F, C>;
export function implementWitherWithIndex() {
   return (i: any) => i();
}

export function implementUCWitherWithIndex<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, G>(_: {
      A: A;
      B: B;
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
      f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, NF>, HKT.OrFix<"K", C, KF>>, a: A) => HKT.HKT<G, Option<B>>
   ) => HKT.HKT<G, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => UC_WitherWithIndexF<F, C>;
export function implementUCWitherWithIndex() {
   return (i: any) => i();
}
