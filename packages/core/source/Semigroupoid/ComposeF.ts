import type * as HKT from "../HKT";

export interface ComposeF<F extends HKT.URIS, C = HKT.Auto> {
   <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, A, B>(fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, A, B>): <
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
         E,
         A
      >
   ) => HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N1, N]>,
      HKT.Mix<C, "K", [K1, K]>,
      HKT.Mix<C, "Q", [Q1, Q]>,
      HKT.Mix<C, "W", [W1, W]>,
      HKT.Mix<C, "X", [X1, X]>,
      HKT.Mix<C, "I", [I1, I]>,
      HKT.Mix<C, "S", [S1, S]>,
      HKT.Mix<C, "R", [R1, R]>,
      E,
      B
   >;
}

export interface UC_ComposeF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, A, B>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      fb: HKT.Kind<
         F,
         C,
         HKT.Intro<C, "N", N, N1>,
         HKT.Intro<C, "K", K, K1>,
         HKT.Intro<C, "Q", Q, Q1>,
         HKT.Intro<C, "W", W, W1>,
         HKT.Intro<C, "X", X, X1>,
         HKT.Intro<C, "I", I, I1>,
         HKT.Intro<C, "S", S, S1>,
         HKT.Intro<C, "R", R, R1>,
         A,
         B
      >
   ): HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N1, N]>,
      HKT.Mix<C, "K", [K1, K]>,
      HKT.Mix<C, "Q", [Q1, Q]>,
      HKT.Mix<C, "W", [W1, W]>,
      HKT.Mix<C, "X", [X1, X]>,
      HKT.Mix<C, "I", [I1, I]>,
      HKT.Mix<C, "S", [S1, S]>,
      HKT.Mix<C, "R", [R1, R]>,
      E,
      B
   >;
}
