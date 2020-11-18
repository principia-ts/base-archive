import type * as HKT from "../HKT";

export interface GiveAllFn<F extends HKT.URIS, TC = HKT.Auto> {
  <R>(r: R): <N extends string, K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, unknown, E, A>;
}

export interface GiveAllFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    r: R
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, unknown, E, A>;
}
