import type * as HKT from "../HKT";

export interface FirstFn<F extends HKT.URIS, C = HKT.Auto> {
   <E, H>(f: (e: E) => H): <N extends string, K, Q, W, X, I, S, R, A>(
      fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, A>;
}

export interface FirstFn_<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, H>(
      fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      f: (e: E) => H
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, A>;
}
