import type * as HKT from "../HKT";

export interface LocalFn<F extends HKT.URIS, C = HKT.Auto> {
  <R0, R>(f: (r0: R0) => R): <N extends string, K, Q, W, X, I, S, E, A>(
    ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>;
}

export interface LocalFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
    ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (r0: R0) => R
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>;
}
