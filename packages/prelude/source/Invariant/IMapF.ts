import type * as HKT from "../HKT";

export interface IMapFn<F extends HKT.URIS, C = HKT.Auto> {
   <A, B>(f: (a: A) => B, g: (b: B) => A): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}

export interface IMapFn_<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, B>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      f: (a: A) => B,
      g: (b: B) => A
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}
