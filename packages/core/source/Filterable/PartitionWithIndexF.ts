import type { PredicateWithIndex, RefinementWithIndex } from "../Function";
import type * as HKT from "../HKT";
import type { Separated, WidenLiteral } from "../Utils";

export interface PartitionWithIndexF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, A, B extends A>(
      refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, A, B>
   ): <Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => Separated<
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, B>
   >;
   <N extends string, K, A>(
      predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, A>
   ): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => Separated<
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, A>
   >;
}

export interface UC_PartitionWithIndexF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, A, B>
   ): Separated<
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, B>
   >;
   <N extends string, K, Q, W, X, I, S, R, E, A>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, A>
   ): Separated<
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, WidenLiteral<N>, K, Q, W, X, I, S, R, E, A>
   >;
}
