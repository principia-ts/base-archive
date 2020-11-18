import type * as HKT from "../HKT";

export interface ReduceRightWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A, b: B) => B
  ): <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B;
}

export interface ReduceRightWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (k: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A, b: B) => B
  ): B;
}

export interface ReduceRightWithIndexFnComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <NF extends string, NG extends string, KF, KG, A, B>(
    b: B,
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<"N", CF, NF>, HKT.OrFix<"K", CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<"N", CG, NG>, HKT.OrFix<"K", CG, KG>>
      ],
      a: A,
      b: B
    ) => B
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
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
  ) => B;
}

export interface ReduceRightWithIndexFnComposition_<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <
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
    b: B,
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<"N", CF, NF>, HKT.OrFix<"K", CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<"N", CG, NG>, HKT.OrFix<"K", CG, KG>>
      ],
      a: A,
      b: B
    ) => B
  ): B;
}
