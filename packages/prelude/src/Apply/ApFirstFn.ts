import type * as HKT from "../HKT";

export interface ApFirstFn<F extends HKT.URIS, TC = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>
  ): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, "N", N1, N>,
      HKT.Intro<TC, "K", K1, K>,
      HKT.Intro<TC, "Q", Q1, Q>,
      HKT.Intro<TC, "W", W1, W>,
      HKT.Intro<TC, "X", X1, X>,
      HKT.Intro<TC, "I", I1, I>,
      HKT.Intro<TC, "S", S1, S>,
      HKT.Intro<TC, "R", R1, R>,
      HKT.Intro<TC, "E", E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, "N", [N1, N]>,
    HKT.Mix<TC, "K", [K1, K]>,
    HKT.Mix<TC, "Q", [Q1, Q]>,
    HKT.Mix<TC, "W", [W1, W]>,
    HKT.Mix<TC, "X", [X1, X]>,
    HKT.Mix<TC, "I", [I1, I]>,
    HKT.Mix<TC, "S", [S1, S]>,
    HKT.Mix<TC, "R", [R1, R]>,
    HKT.Mix<TC, "E", [E1, E]>,
    A
  >;
}

export interface ApFirstFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A,
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    B
  >(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, "N", N, N1>,
      HKT.Intro<TC, "K", K, K1>,
      HKT.Intro<TC, "Q", Q, Q1>,
      HKT.Intro<TC, "W", W, W1>,
      HKT.Intro<TC, "X", X, X1>,
      HKT.Intro<TC, "I", I, I1>,
      HKT.Intro<TC, "S", S, S1>,
      HKT.Intro<TC, "R", R, R1>,
      HKT.Intro<TC, "E", E, E1>,
      B
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, "N", [N1, N]>,
    HKT.Mix<TC, "K", [K1, K]>,
    HKT.Mix<TC, "Q", [Q1, Q]>,
    HKT.Mix<TC, "W", [W1, W]>,
    HKT.Mix<TC, "X", [X1, X]>,
    HKT.Mix<TC, "I", [I1, I]>,
    HKT.Mix<TC, "S", [S1, S]>,
    HKT.Mix<TC, "R", [R1, R]>,
    HKT.Mix<TC, "E", [E1, E]>,
    A
  >;
}

export interface ApFirstFnComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  TCF = HKT.Auto,
  TCG = HKT.Auto
> {
  <
    NF1 extends string,
    KF1,
    QF1,
    WF1,
    XF1,
    IF1,
    SF1,
    RF1,
    EF1,
    NG1 extends string,
    KG1,
    QG1,
    WG1,
    XG1,
    IG1,
    SG1,
    RG1,
    EG1,
    A,
    B
  >(
    fgb: HKT.Kind<
      F,
      TCF,
      NF1,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
    >
  ): <
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
    EG
  >(
    fga: HKT.Kind<
      F,
      TCF,
      HKT.Intro<TCF, "N", NF1, NF>,
      HKT.Intro<TCF, "K", KF1, KF>,
      HKT.Intro<TCF, "Q", QF1, QF>,
      HKT.Intro<TCF, "W", WF1, WF>,
      HKT.Intro<TCF, "X", XF1, XF>,
      HKT.Intro<TCF, "I", IF1, IF>,
      HKT.Intro<TCF, "S", SF1, SF>,
      HKT.Intro<TCF, "R", RF1, RF>,
      HKT.Intro<TCF, "E", EF1, EF>,
      HKT.Kind<
        G,
        TCG,
        HKT.Intro<TCG, "N", NG1, NG>,
        HKT.Intro<TCG, "K", KG1, KG>,
        HKT.Intro<TCG, "Q", QG1, QG>,
        HKT.Intro<TCG, "W", WG1, WG>,
        HKT.Intro<TCG, "X", XG1, XG>,
        HKT.Intro<TCG, "I", IG1, IG>,
        HKT.Intro<TCG, "S", SG1, SG>,
        HKT.Intro<TCG, "R", RG1, RG>,
        HKT.Intro<TCG, "E", EG1, EG>,
        B
      >
    >
  ) => HKT.Kind<
    F,
    TCF,
    HKT.Mix<TCF, "N", [NF1, NF]>,
    HKT.Mix<TCF, "K", [KF1, KF]>,
    HKT.Mix<TCF, "Q", [QF1, QF]>,
    HKT.Mix<TCF, "W", [WF1, WF]>,
    HKT.Mix<TCF, "X", [XF1, XF]>,
    HKT.Mix<TCF, "I", [IF1, IF]>,
    HKT.Mix<TCF, "S", [SF1, SF]>,
    HKT.Mix<TCF, "R", [RF1, RF]>,
    HKT.Mix<TCF, "E", [EF1, EF]>,
    HKT.Kind<
      G,
      TCG,
      HKT.Mix<TCG, "N", [NG1, NG]>,
      HKT.Mix<TCG, "K", [KG1, KG]>,
      HKT.Mix<TCG, "Q", [QG1, QG]>,
      HKT.Mix<TCG, "W", [WG1, WG]>,
      HKT.Mix<TCG, "X", [XG1, XG]>,
      HKT.Mix<TCG, "I", [IG1, IG]>,
      HKT.Mix<TCG, "S", [SG1, SG]>,
      HKT.Mix<TCG, "R", [RG1, RG]>,
      HKT.Mix<TCG, "E", [EG1, EG]>,
      A
    >
  >;
}
