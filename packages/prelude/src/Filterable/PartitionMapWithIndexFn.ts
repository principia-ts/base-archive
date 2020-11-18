import type { Either } from "../Either";
import type * as HKT from "../HKT";
import type { Separated } from "../Utils";

export interface PartitionMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B, B1>(
    f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => Either<B, B1>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>
  >;
}

export interface PartitionMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B, B1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => Either<B, B1>
  ): Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>
  >;
}
