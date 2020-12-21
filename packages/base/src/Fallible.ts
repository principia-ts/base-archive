import type { Either } from "./data/Either";
import type { Fail } from "./Fail";
import type * as HKT from "./HKT";

export interface Fallible<F extends HKT.URIS, C = HKT.Auto> extends Fail<F, C> {
  readonly absolve: AbsolveFn<F, C>;
  readonly recover: RecoverFn<F, C>;
}

export interface AbsolveFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, E1, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<E1, A>>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, HKT.Mix<C, "E", [E, E1]>, A>;
}

export interface RecoverFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, never, Either<HKT.OrFix<"E", C, E>, A>>;
}
