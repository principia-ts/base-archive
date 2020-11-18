import type * as HKT from "../HKT";
import type { Option } from "../Option";

export interface FilterMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => Option<B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>;
}

export interface FilterMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => Option<B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>;
}
