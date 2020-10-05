import type * as HKT from "../HKT";
import type { Maybe } from "../Maybe";

export interface CompactF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Maybe<A>>
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>;
}
