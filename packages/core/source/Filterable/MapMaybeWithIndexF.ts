import type * as HKT from "../HKT";
import type { Maybe } from "../Maybe";

export interface MapMaybeWithIndexF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, A, B>(
      f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => Maybe<B>
   ): <Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}

export interface UC_MapMaybeWithIndexF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, B>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      f: (i: HKT.IndexFor<F, HKT.OrFix<"N", C, N>, HKT.OrFix<"K", C, K>>, a: A) => Maybe<B>
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}
