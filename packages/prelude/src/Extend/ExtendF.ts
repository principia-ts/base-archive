import type * as HKT from "../HKT";

export interface ExtendF<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    f: (wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
  ): (
    wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}

export interface UC_ExtendF<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}
