import type { Applicative } from './Applicative'
import type { FilterableMin } from './Filterable'
import type { Either } from './internal/Either'
import type { Option } from './internal/Option'
import type { TraversableMin } from './Traversable'

import { Filterable } from './Filterable'
import * as HKT from './HKT'
import { Traversable } from './Traversable'

export interface Witherable<F extends HKT.URIS, C = HKT.Auto> extends Filterable<F, C>, Traversable<F, C> {
  readonly separateA_: WiltFn_<F, C>
  readonly separateA: WiltFn<F, C>
  readonly compactA_: WitherFn_<F, C>
  readonly compactA: WitherFn<F, C>
}

export type WitherableMin<F extends HKT.URIS, C = HKT.Auto> = FilterableMin<F, C> &
  TraversableMin<F, C> & {
    readonly separateA_: WiltFn_<F, C>
    readonly compactA_: WitherFn_<F, C>
  }

export function Witherable<F extends HKT.URIS, C = HKT.Auto>(F: WitherableMin<F, C>): Witherable<F, C> {
  return HKT.instance({
    ...Filterable(F),
    ...Traversable(F),
    separateA_: F.separateA_,
    separateA: (A) => {
      const separateA_ = F.separateA_(A)
      return (f) => (wa) => separateA_(wa, f)
    },
    compactA_: F.compactA_,
    compactA: (A) => {
      const compactA_ = F.compactA_(A)
      return (f) => (wa) => compactA_(wa, f)
    }
  })
}

export interface WitherFn<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    f: (a: A) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
  ) => <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF>(
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export interface _WitherFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    G extends HKT.URIS,
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
    GC = HKT.Auto
  >(
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    A: Applicative<G, GC>,
    f: (a: A) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, Option<B>>
  ): HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
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
  ) => HKT.Kind<G, GC, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, C, string, KF, QF, WF, XF, IF, SF, RF, EF, B>>
}

export function implementWither<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
    A: A
    B: B
    G: G
    NF: NF
    FK: FK
    FQ: FQ
    FW: FW
    FX: FX
    FI: FI
    FS: FS
    FR: FR
    FE: FE
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, Option<B>>
  ) => (
    wa: HKT.Kind<F, C, NF, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, string, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn<F, C>
export function implementWither() {
  return (i: any) => i()
}

export function implementWither_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
    A: A
    B: B
    G: G
    NF: NF
    FK: FK
    FQ: FQ
    FW: FW
    FX: FX
    FI: FI
    FS: FS
    FR: FR
    FE: FE
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    wa: HKT.Kind<F, C, NF, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    f: (a: A) => HKT.HKT<G, Option<B>>
  ) => HKT.HKT<G, HKT.Kind<F, C, string, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherFn_<F, C>
export function implementWither_() {
  return (i: any) => i()
}

export interface _WiltFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    G extends HKT.URIS,
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
    B,
    CG = HKT.Auto
  >(
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    A: Applicative<G, CG>,
    f: (a: A) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, Either<B, B1>>
  ): HKT.Kind<
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
    readonly [
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B1>
    ]
  >
}

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
    readonly [
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B1>
    ]
  >
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
    readonly [
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B1>
    ]
  >
}

export function implementWilt<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, B, B1, G>(_: {
    A: A
    B: B
    B1: B1
    G: G
    NF: NF
    KF: KF
    QF: QF
    WF: WF
    XF: XF
    IF: IF
    SF: SF
    RF: RF
    EF: EF
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, Either<B, B1>>
  ) => (
    wa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>
  ) => HKT.HKT<
    G,
    readonly [
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B>,
      HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, B1>
    ]
  >
) => WiltFn<F, C>
export function implementWilt() {
  return (i: any) => i()
}
