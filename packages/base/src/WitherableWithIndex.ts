import type { Applicative } from './Applicative'
import type { FilterableWithIndexMin } from './FilterableWithIndex'
import type { Either } from './internal/Either'
import type { Option } from './internal/Option'
import type { TraversableWithIndexMin } from './TraversableWithIndex'

import { FilterableWithIndex } from './FilterableWithIndex'
import * as HKT from './HKT'
import { TraversableWithIndex } from './TraversableWithIndex'

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends FilterableWithIndex<F, C>,
    TraversableWithIndex<F, C> {
  readonly icompactA_: WitherWithIndexFn_<F, C>
  readonly icompactA: WitherWithIndexFn<F, C>
  readonly iseparateA_: WiltWithIndexFn_<F, C>
  readonly iseparateA: WiltWithIndexFn<F, C>
}

export type WitherableWithIndexMin<F extends HKT.URIS, C = HKT.Auto> = FilterableWithIndexMin<F, C> &
  TraversableWithIndexMin<F, C> & {
    readonly icompactA_: WitherWithIndexFn_<F, C>
    readonly iseparateA_: WiltWithIndexFn_<F, C>
  }

export function WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>(
  F: WitherableWithIndexMin<F, C>
): WitherableWithIndex<F, C> {
  return HKT.instance({
    ...FilterableWithIndex(F),
    ...TraversableWithIndex(F),
    iseparateA_: F.iseparateA_,
    iseparateA: (A) => {
      const iseparateA_ = F.iseparateA_(A)
      return (f) => (wa) => iseparateA_(wa, f)
    },
    icompactA_: F.icompactA_,
    icompactA: (A) => {
      const icompactA_ = F.icompactA_(A)
      return (f) => (wa) => icompactA_(wa, f)
    }
  })
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
