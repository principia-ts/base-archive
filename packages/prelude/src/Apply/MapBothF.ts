import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";

export interface MapBothFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (a: A, b: B) => C
  ): <N extends string, K, Q, W, X, I, S, R, E>(
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
    C
  >;
}

export interface MapBothFn_<F extends HKT.URIS, TC = HKT.Auto> {
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
    B,
    C
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
    >,
    f: (a: A, b: B) => C
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, "N", [N, N1]>,
    HKT.Mix<TC, "K", [K, K1]>,
    HKT.Mix<TC, "Q", [Q, Q1]>,
    HKT.Mix<TC, "W", [W, W1]>,
    HKT.Mix<TC, "X", [X, X1]>,
    HKT.Mix<TC, "I", [I1, I1]>,
    HKT.Mix<TC, "S", [S, S1]>,
    HKT.Mix<TC, "R", [R, R1]>,
    HKT.Mix<TC, "E", [E, E1]>,
    C
  >;
}

export interface MapBothFnComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  TCF = HKT.Auto,
  TCG = HKT.Auto
> {
  <
    A,
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
    B,
    C
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
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>
    >,
    f: (a: A, b: B) => C
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
        A
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
      C
    >
  >;
}

export interface MapBothFnComposition_<
  F extends HKT.URIS,
  G extends HKT.URIS,
  TCF = HKT.Auto,
  TCG = HKT.Auto
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
    B,
    C
  >(
    fga: HKT.Kind<
      F,
      TCF,
      NF,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      HKT.Kind<G, TCG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>
    >,
    fgb: HKT.Kind<
      F,
      TCF,
      HKT.Intro<TCF, "N", NF, NF1>,
      HKT.Intro<TCF, "K", KF, KF1>,
      HKT.Intro<TCF, "Q", QF, QF1>,
      HKT.Intro<TCF, "W", WF, WF1>,
      HKT.Intro<TCF, "X", XF, XF1>,
      HKT.Intro<TCF, "I", IF, IF1>,
      HKT.Intro<TCF, "S", SF, SF1>,
      HKT.Intro<TCF, "R", RF, RF1>,
      HKT.Intro<TCF, "E", EF, EF1>,
      HKT.Kind<
        G,
        TCG,
        HKT.Intro<TCG, "N", NG, NG1>,
        HKT.Intro<TCG, "K", KG, KG1>,
        HKT.Intro<TCG, "Q", QG, QG1>,
        HKT.Intro<TCG, "W", WG, WG1>,
        HKT.Intro<TCG, "X", XG, XG1>,
        HKT.Intro<TCG, "I", IG, IG1>,
        HKT.Intro<TCG, "S", SG, SG1>,
        HKT.Intro<TCG, "R", RG, RG1>,
        HKT.Intro<TCG, "E", EG, EG1>,
        B
      >
    >,
    f: (a: A, b: B) => C
  ): HKT.Kind<
    F,
    TCF,
    HKT.Mix<TCF, "N", [NF, NF1]>,
    HKT.Mix<TCF, "K", [KF, KF1]>,
    HKT.Mix<TCF, "Q", [QF, QF1]>,
    HKT.Mix<TCF, "W", [WF, WF1]>,
    HKT.Mix<TCF, "X", [XF, XF1]>,
    HKT.Mix<TCF, "I", [IF, IF1]>,
    HKT.Mix<TCF, "S", [SF, SF1]>,
    HKT.Mix<TCF, "R", [RF, RF1]>,
    HKT.Mix<TCF, "E", [EF, EF1]>,
    HKT.Kind<
      G,
      TCG,
      HKT.Mix<TCG, "N", [NG, NG1]>,
      HKT.Mix<TCG, "K", [KG, KG1]>,
      HKT.Mix<TCG, "Q", [QG, QG1]>,
      HKT.Mix<TCG, "W", [WG, WG1]>,
      HKT.Mix<TCG, "X", [XG, XG1]>,
      HKT.Mix<TCG, "I", [IG, IG1]>,
      HKT.Mix<TCG, "S", [SG, SG1]>,
      HKT.Mix<TCG, "R", [RG, RG1]>,
      HKT.Mix<TCG, "E", [EG, EG1]>,
      C
    >
  >;
}

export function mapBothF<F extends HKT.URIS, TC = HKT.Auto>(
  F: Applicative<F, TC>
): MapBothFn<F, TC>;
export function mapBothF<F>(F: Applicative<HKT.UHKT<F>>): MapBothFn<HKT.UHKT<F>> {
  return (fb, f) => (fa) => F.map_(F.both_(fa, fb), ([a, b]) => f(a, b));
}

export function mapBothF_<F extends HKT.URIS, TC = HKT.Auto>(
  F: Applicative<F, TC>
): MapBothFn_<F, TC>;
export function mapBothF_<F>(F: Applicative<HKT.UHKT<F>>): MapBothFn_<HKT.UHKT<F>> {
  return (fa, fb, f) => F.map_(F.both_(fa, fb), ([a, b]) => f(a, b));
}
