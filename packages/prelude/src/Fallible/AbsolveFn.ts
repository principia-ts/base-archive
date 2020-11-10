import type { Either } from "../Either";
import type * as HKT from "../HKT";

export interface AbsolveFn<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, E1, A>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<E1, A>>
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, HKT.Mix<C, "E", [E, E1]>, A>;
}
