import type * as HKT from "../HKT";

export interface BindToSF<F extends HKT.URIS, C = HKT.Auto> {
   <BN extends string>(name: BN): <N extends string, K, Q, W, X, I, S, R, E, A>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, { [K in BN]: A }>;
}
