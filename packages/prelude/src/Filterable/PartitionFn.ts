import type { Predicate, Refinement } from "../Function";
import type * as HKT from "../HKT";
import type { Separated } from "../Utils";

export interface PartitionFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B extends A>(refinement: Refinement<A, B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  >;
  <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
  >;
}

export interface PartitionFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: Refinement<A, B>
  ): Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  >;
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: Predicate<A>
  ): Separated<
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
  >;
}
