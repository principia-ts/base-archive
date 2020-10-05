import type * as HKT from "../HKT";

export interface ProvideF<F extends HKT.URIS, C = HKT.Auto> {
   <R>(r: R): <N extends string, K, Q, W, X, I, S, R0, E, A>(
      ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R & R0, E, A>
   ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>;
}

export interface UC_ProvideF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
      ma: HKT.Kind<F, C, N, K, Q, W, X, I, S, R & R0, E, A>,
      r: R
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R0, E, A>;
}
