import type * as HKT from "../HKT";

export interface TapF<F extends HKT.URIS, C = HKT.Auto> {
   <A, N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, B>(
      f: (a: A) => HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
   ): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<
         F,
         C,
         HKT.Intro<C, "N", N2, N>,
         HKT.Intro<C, "K", K2, K>,
         HKT.Intro<C, "Q", Q2, Q>,
         HKT.Intro<C, "W", W2, W>,
         HKT.Intro<C, "X", X2, X>,
         HKT.Intro<C, "I", I2, I>,
         HKT.Intro<C, "S", S2, S>,
         HKT.Intro<C, "R", R2, R>,
         HKT.Intro<C, "E", E2, E>,
         A
      >
   ) => HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N2, N]>,
      HKT.Mix<C, "K", [K2, K]>,
      HKT.Mix<C, "Q", [Q2, Q]>,
      HKT.Mix<C, "W", [W2, W]>,
      HKT.Mix<C, "X", [X2, X]>,
      HKT.Mix<C, "I", [I2, I]>,
      HKT.Mix<C, "S", [S2, S]>,
      HKT.Mix<C, "R", [R2, R]>,
      HKT.Mix<C, "E", [E2, E]>,
      A
   >;
}

export interface UC_TapF<F extends HKT.URIS, C = HKT.Auto> {
   <
      N extends string,
      K,
      Q,
      W,
      X,
      I,
      S,
      R,
      E,
      A,
      N2 extends string,
      K2,
      Q2,
      W2,
      X2,
      I2,
      S2,
      R2,
      E2,
      B
   >(
      fa: HKT.Kind<
         F,
         C,
         HKT.Intro<C, "N", N2, N>,
         HKT.Intro<C, "K", K2, K>,
         HKT.Intro<C, "Q", Q2, Q>,
         HKT.Intro<C, "W", W2, W>,
         HKT.Intro<C, "X", X2, X>,
         HKT.Intro<C, "I", I2, I>,
         HKT.Intro<C, "S", S2, S>,
         HKT.Intro<C, "R", R2, R>,
         HKT.Intro<C, "E", E2, E>,
         A
      >,
      f: (a: A) => HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
   ): HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N2, N]>,
      HKT.Mix<C, "K", [K2, K]>,
      HKT.Mix<C, "Q", [Q2, Q]>,
      HKT.Mix<C, "W", [W2, W]>,
      HKT.Mix<C, "X", [X2, X]>,
      HKT.Mix<C, "I", [I2, I]>,
      HKT.Mix<C, "S", [S2, S]>,
      HKT.Mix<C, "R", [R2, R]>,
      HKT.Mix<C, "E", [E2, E]>,
      A
   >;
}
