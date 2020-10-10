import type * as HKT from "../HKT";

export interface AsksMFn<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R0, R, E, A>(
      f: (_: R0) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, HKT.Mix<C, "R", [R, R0]>, E, A>;
}
