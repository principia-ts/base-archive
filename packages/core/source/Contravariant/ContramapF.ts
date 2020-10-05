import * as HKT from "../HKT";

export interface ContramapF<F extends HKT.URIS, C = HKT.Auto> {
   <A, B>(f: (a: B) => A): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}

export interface UC_ContramapF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, B>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      f: (a: B) => A
   ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>;
}

export interface ContramapFComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
> {
   <A, B>(f: (b: A) => B): <
      NF extends string,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      NG extends string,
      KG,
      QG,
      WG,
      XG,
      IG,
      SG,
      RG,
      EG
   >(
      fa: HKT.Kind<
         F,
         CF,
         NF,
         KF,
         QF,
         WF,
         XF,
         IF,
         SF,
         RF,
         EF,
         HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>
      >
   ) => HKT.Kind<
      F,
      CF,
      NF,
      KF,
      QF,
      WF,
      XF,
      IF,
      SF,
      RF,
      EF,
      HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>
   >;
}
