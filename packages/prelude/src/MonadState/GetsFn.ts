import type * as HKT from "../HKT";

export interface GetsFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    A,
    N extends string = HKT.Initial<TC, "N">,
    K = HKT.Initial<TC, "K">,
    Q = HKT.Initial<TC, "Q">,
    W = HKT.Initial<TC, "W">,
    X = HKT.Initial<TC, "X">,
    I = HKT.Initial<TC, "I">,
    R = HKT.Initial<TC, "R">,
    E = HKT.Initial<TC, "E">
  >(
    f: (s: S) => A
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>;
}
