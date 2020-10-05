import type { Either } from "../Either";
import type * as HKT from "../HKT";
import type { Separated } from "../Utils";

export interface SeparateF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, B>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<A, B>>
   ): Separated<
      HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
   >;
}
