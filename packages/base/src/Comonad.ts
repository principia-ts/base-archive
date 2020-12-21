import type { Extend } from "./Extend";
import type * as HKT from "./HKT";

export interface Comonad<F extends HKT.URIS, C = HKT.Auto> extends Extend<F, C> {
  readonly extract: ExtractFn<F, C>;
}

export interface ExtractFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ): A;
}
