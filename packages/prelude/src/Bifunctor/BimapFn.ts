import type * as HKT from "../HKT";

export interface BimapFn<F extends HKT.URIS, C = HKT.Auto> {
  <E, A, H, B>(f: (e: E) => H, g: (a: A) => B): <N extends string, K, Q, W, X, I, S, R>(
    fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, B>;
}

export interface BimapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, H, B>(
    fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (e: E) => H,
    g: (a: A) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, B>;
}
