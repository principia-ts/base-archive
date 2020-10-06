import type * as HKT from "../HKT";

export interface ApSF<F extends HKT.URIS, C = HKT.Auto> {
   <BN extends string, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
      name: Exclude<BN, keyof A>,
      fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
   ): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<
         F,
         C,
         HKT.Intro<C, "N", N1, N>,
         HKT.Intro<C, "K", K1, K>,
         HKT.Intro<C, "Q", Q1, Q>,
         HKT.Intro<C, "W", W1, W>,
         HKT.Intro<C, "X", X1, X>,
         HKT.Intro<C, "I", I1, I>,
         HKT.Intro<C, "S", S1, S>,
         HKT.Intro<C, "R", R1, R>,
         HKT.Intro<C, "E", E1, E>,
         A
      >
   ) => HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N, N1]>,
      HKT.Mix<C, "K", [K, K1]>,
      HKT.Mix<C, "Q", [Q, Q1]>,
      HKT.Mix<C, "W", [W, W1]>,
      HKT.Mix<C, "X", [X, X1]>,
      HKT.Mix<C, "I", [I, I1]>,
      HKT.Mix<C, "S", [S, S1]>,
      HKT.Mix<C, "R", [R, R1]>,
      HKT.Mix<C, "E", [E, E1]>,
      { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
   >;
}
