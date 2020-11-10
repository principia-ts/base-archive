import type { Either } from "../Either";
import type * as HKT from "../HKT";
import type { Separated } from "../Utils";

export interface MapEitherFn<F extends HKT.URIS, C = HKT.Auto> {
   <A, B, B1>(f: (a: A) => Either<B, B1>): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => Separated<
      HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>,
      HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>
   >;
}

export interface MapEitherFn_<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, B, B1>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      f: (a: A) => Either<B, B1>
   ): Separated<HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>>;
}
