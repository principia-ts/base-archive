import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";
import type { Option } from "../Option";

export interface WitherFn<F extends HKT.URIS, C = HKT.Auto> {
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
    B
  >(
    f: (a: A) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
  ) => <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF>(
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
    HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>
  >;
}

export interface WitherFn_<F extends HKT.URIS, C = HKT.Auto> {
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
    f: (a: A) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
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
    HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>
  >;
}

export function implementWither<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
    A: A;
    B: B;
    G: G;
    NF: NF;
    FK: FK;
    FQ: FQ;
    FW: FW;
    FX: FX;
    FI: FI;
    FS: FS;
    FR: FR;
    FE: FE;
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, Option<B>>
  ) => (
    wa: HKT.Kind<F, C, NF, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, string, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn<F, C>;
export function implementWither() {
  return (i: any) => i();
}

export function implementWither_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
    A: A;
    B: B;
    G: G;
    NF: NF;
    FK: FK;
    FQ: FQ;
    FW: FW;
    FX: FX;
    FI: FI;
    FS: FS;
    FR: FR;
    FE: FE;
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    wa: HKT.Kind<F, C, NF, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    f: (a: A) => HKT.HKT<G, Option<B>>
  ) => HKT.HKT<G, HKT.Kind<F, C, string, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn_<F, C>;
export function implementWither_() {
  return (i: any) => i();
}
