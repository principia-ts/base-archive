import type * as HKT from "../HKT";
import type { Monoid } from "../Monoid";

export interface FoldMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <N extends string, K, A>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => M;
}

export interface FoldMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => M
  ) => M;
}

export interface FoldMapWithIndexFnComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <M>(M: Monoid<M>): <NF extends string, NG extends string, KF, KG, A>(
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<"N", CF, NF>, HKT.OrFix<"K", CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<"N", CG, NG>, HKT.OrFix<"K", CG, KG>>
      ],
      a: A
    ) => M
  ) => <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<
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
      HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>
    >
  ) => M;
}

export interface FoldMapWithIndexFnComposition_<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <M>(M: Monoid<M>): <
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
    fga: HKT.Kind<
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
      HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>
    >,
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<"N", CF, NF>, HKT.OrFix<"K", CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<"N", CG, NG>, HKT.OrFix<"K", CG, KG>>
      ],
      a: A
    ) => M
  ) => M;
}
