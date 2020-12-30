import type { Applicative } from './Applicative'
import type { Either } from './data/Either'
import type { Option } from './data/Option'
import type * as HKT from './HKT'
import type { Separated } from './util/types'

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly witherWithIndex_: WitherWithIndexFn_<F, C>
  readonly witherWithIndex: WitherWithIndexFn<F, C>
  readonly wiltWithIndex_: WiltWithIndexFn_<F, C>
  readonly wiltWithIndex: WiltWithIndexFn<F, C>
}

export interface WitherWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
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
      k: HKT.IndexFor<F, HKT.OrFix<'N', C, NF>, HKT.OrFix<'K', C, KF>>,
      a: A
    ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
  ) => <QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface WitherWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
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
      k: HKT.IndexFor<F, HKT.OrFix<'N', C, NF>, HKT.OrFix<'K', C, KF>>,
      a: A
    ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
  ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export function implementWitherWithIndex<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, G>(_: {
    A: A
    B: B
    G: G
    NF: NF
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', F, NF>, HKT.OrFix<'K', F, KF>>, a: A) => HKT.HKT<G, Option<B>>
  ) => (
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => WitherWithIndexFn<F, C>
export function implementWitherWithIndex() {
  return (i: any) => i()
}

export function implementWitherWithIndex_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, G>(_: {
    A: A
    B: B
    G: G
    NF: NF
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, NF>, HKT.OrFix<'K', C, KF>>, a: A) => HKT.HKT<G, Option<B>>
  ) => HKT.HKT<G, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
) => WitherWithIndexFn_<F, C>
export function implementWitherWithIndex_() {
  return (i: any) => i()
}

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
      k: HKT.IndexFor<F, HKT.OrFix<'N', C, NF>, HKT.OrFix<'K', C, KF>>,
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
    readonly [
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
    ]
  >
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
      k: HKT.IndexFor<F, HKT.OrFix<'N', C, NF>, HKT.OrFix<'K', C, KF>>,
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
    readonly [
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
    ]
  >
}

export function implementWiltWithIndex<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, B2, G>(_: {
    A: A
    B: B
    B2: B2
    G: G
    NF: NF
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, NF>, HKT.OrFix<'K', C, KF>>, a: A) => HKT.HKT<G, Either<B, B2>>
  ) => (
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.HKT<
    G,
    readonly [
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
    ]
  >
) => WiltWithIndexFn<F, C>
export function implementWiltWithIndex() {
  return (i: any) => i()
}

export function implementWiltWithIndex_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, B2, G>(_: {
    A: A
    B: B
    B2: B2
    G: G
    NF: NF
    FK: KF
    FQ: QF
    FW: WF
    FX: XF
    FI: IF
    FS: SF
    FR: RF
    FE: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, NF>, HKT.OrFix<'K', C, KF>>, a: A) => HKT.HKT<G, Either<B, B2>>
  ) => HKT.HKT<
    G,
    readonly [
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B2>
    ]
  >
) => WiltWithIndexFn_<F, C>
export function implementWiltWithIndex_() {
  return (i: any) => i()
}
