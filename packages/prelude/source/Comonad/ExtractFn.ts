import type * as HKT from "../HKT";

export interface ExtractFn<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A>(wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): A;
}
