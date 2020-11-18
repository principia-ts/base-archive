import type * as HKT from "../HKT";

export interface SucceedF<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<C, "N">,
    K = HKT.Initial<C, "K">,
    Q = HKT.Initial<C, "Q">,
    W = HKT.Initial<C, "W">,
    X = HKT.Initial<C, "X">,
    I = HKT.Initial<C, "I">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >(
    a: A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>;
}
