import type * as HKT from "../HKT";

export interface LetSF<F extends HKT.URIS, C = HKT.Auto> {
   <BN extends string, A1, A>(name: Exclude<BN, keyof A>, f: (a: A) => A1): <
      N extends string,
      K,
      Q,
      W,
      X,
      I,
      S,
      R,
      E
   >(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => HKT.Kind<
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
      E,
      { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
   >;
}
