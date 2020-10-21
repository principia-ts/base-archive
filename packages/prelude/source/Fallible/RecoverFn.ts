import type { Either } from "../Either";
import type * as HKT from "../HKT";

export interface RecoverFn<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
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
      never,
      Either<HKT.OrFix<"E", C, E>, A>
   >;
}
