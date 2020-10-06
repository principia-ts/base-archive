import type * as HKT from "../HKT";

export interface SwapF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A>(pab: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
      F,
      C,
      N,
      K,
      Q,
      W,
      X,
      I,
      S,
      R,
      A,
      E
   >;
}
