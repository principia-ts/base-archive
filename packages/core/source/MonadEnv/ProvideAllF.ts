import type * as HKT from "../HKT";

export interface ProvideAllF<F extends HKT.URIS, C = HKT.Auto> {
   <R>(r: R): <N extends string, K, Q, W, X, I, S, E, A>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, unknown, E, A>;
}

export interface UC_ProvideAllF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>, r: R): HKT.Kind<
      F,
      C,
      N,
      K,
      Q,
      W,
      X,
      I,
      S,
      unknown,
      E,
      A
   >;
}
