import type * as HKT from "../HKT";

export interface PutFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    N extends string = HKT.Initial<TC, "N">,
    K = HKT.Initial<TC, "K">,
    Q = HKT.Initial<TC, "Q">,
    W = HKT.Initial<TC, "W">,
    X = HKT.Initial<TC, "X">,
    I = HKT.Initial<TC, "I">,
    R = HKT.Initial<TC, "R">,
    E = HKT.Initial<TC, "E">
  >(
    s: S
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, void>;
}
