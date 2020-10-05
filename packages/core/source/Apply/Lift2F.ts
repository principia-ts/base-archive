import type * as HKT from "../HKT";

export interface Lift2F<F extends HKT.URIS, C = HKT.Auto> {
   <A, B, D>(f: (a: A) => (b: B) => D): <
      N extends string,
      K,
      Q,
      W,
      X,
      I,
      S,
      R,
      E,
      N1 extends string,
      K1,
      Q1,
      W1,
      X1,
      I1,
      S1,
      R1,
      E1
   >(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => (
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
         HKT.Intro<C, "E", E, E1>,
         B
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
      HKT.Mix<C, "E", [E1, E]>,
      D
   >;
}
