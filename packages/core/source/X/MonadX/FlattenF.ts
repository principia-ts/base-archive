import type * as HKT from "../../HKT";

export interface FlattenF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, S1, R, E, A, N2 extends string, K2, Q2, W2, X2, R2, E2>(
      ffa: HKT.Kind<
         F,
         C,
         N2,
         K2,
         Q2,
         W2,
         X2,
         S1,
         S1,
         R2,
         E2,
         HKT.Kind<
            F,
            C,
            HKT.Intro<C, "N", N2, N>,
            HKT.Intro<C, "K", K2, K>,
            HKT.Intro<C, "Q", Q2, Q>,
            HKT.Intro<C, "W", W2, W>,
            HKT.Intro<C, "X", X2, X>,
            S1,
            S1,
            HKT.Intro<C, "R", R2, R>,
            HKT.Intro<C, "E", E2, E>,
            A
         >
      >
   ): HKT.Kind<
      F,
      C,
      HKT.Mix<C, "N", [N2, N]>,
      HKT.Mix<C, "K", [K2, K]>,
      HKT.Mix<C, "Q", [Q2, Q]>,
      HKT.Mix<C, "W", [W2, W]>,
      HKT.Mix<C, "X", [X2, X]>,
      S1,
      S1,
      HKT.Mix<C, "R", [R2, R]>,
      HKT.Mix<C, "E", [E2, E]>,
      A
   >;
}
