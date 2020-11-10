import type * as HKT from "../HKT";

export interface GiveFn<F extends HKT.URIS, TC = HKT.Auto> {
   <R>(r: R): <N extends string, K, Q, W, X, I, S, R0, E, A>(
      ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R & R0, E, A>
   ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R0, E, A>;
}

export interface GiveFn_<F extends HKT.URIS, TC = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
      ma: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R & R0, E, A>,
      r: R
   ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R0, E, A>;
}
