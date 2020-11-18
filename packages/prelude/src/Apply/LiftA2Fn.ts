import type * as HKT from "../HKT";

export interface LiftA2Fn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, B, D>(f: (a: A) => (b: B) => D): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1
  >(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
  ) => (
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
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, "N", [N, N1]>,
    HKT.Mix<TC, "K", [K, K1]>,
    HKT.Mix<TC, "Q", [Q, Q1]>,
    HKT.Mix<TC, "W", [W, W1]>,
    HKT.Mix<TC, "X", [X, X1]>,
    HKT.Mix<TC, "I", [I, I1]>,
    HKT.Mix<TC, "S", [S, S1]>,
    HKT.Mix<TC, "R", [R, R1]>,
    HKT.Mix<TC, "E", [E, E1]>,
    D
  >;
}
