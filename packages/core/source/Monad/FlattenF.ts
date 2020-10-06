import type * as HKT from "../HKT";

export interface FlattenF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2>(
      ffa: HKT.Kind<
         F,
         C,
         N2,
         K2,
         Q2,
         W2,
         X2,
         I2,
         S2,
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
            HKT.Intro<C, "I", I2, I>,
            HKT.Intro<C, "S", S2, S>,
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
      HKT.Mix<C, "I", [I2, I]>,
      HKT.Mix<C, "S", [S2, S]>,
      HKT.Mix<C, "R", [R2, R]>,
      HKT.Mix<C, "E", [E2, E]>,
      A
   >;
}

export interface FlattenFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <
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
      EG,
      NF1 extends string,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      NG1 extends string,
      KG1,
      QG1,
      WG1,
      XG1,
      IG1,
      SG1,
      RG1,
      EG1,
      A
   >(
      fgfga: HKT.Kind<
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
         HKT.Kind<
            G,
            CG,
            NG,
            KG,
            QG,
            WG,
            XG,
            IG,
            SG,
            RG,
            EG,
            HKT.Kind<
               F,
               CF,
               HKT.Intro<CF, "N", NF, NF1>,
               HKT.Intro<CF, "K", KF, KF1>,
               HKT.Intro<CF, "Q", QF, QF1>,
               HKT.Intro<CF, "W", WF, WF1>,
               HKT.Intro<CF, "X", XF, XF1>,
               HKT.Intro<CF, "I", IF, IF1>,
               HKT.Intro<CF, "S", SF, SF1>,
               HKT.Intro<CF, "R", RF, RF1>,
               HKT.Intro<CF, "E", EF, EF1>,
               HKT.Kind<
                  G,
                  CG,
                  HKT.Intro<CG, "N", NG, NG1>,
                  HKT.Intro<CG, "K", KG, KG1>,
                  HKT.Intro<CG, "Q", QG, QG1>,
                  HKT.Intro<CG, "W", WG, WG1>,
                  HKT.Intro<CG, "X", XG, XG1>,
                  HKT.Intro<CG, "I", IG, IG1>,
                  HKT.Intro<CG, "S", SG, SG1>,
                  HKT.Intro<CG, "R", RG, RG1>,
                  HKT.Intro<CG, "E", EG, EG1>,
                  A
               >
            >
         >
      >
   ): HKT.Kind<
      F,
      CF,
      HKT.Mix<CF, "N", [NF1, NF]>,
      HKT.Mix<CF, "K", [KF1, KF]>,
      HKT.Mix<CF, "Q", [QF1, QF]>,
      HKT.Mix<CF, "W", [WF1, WF]>,
      HKT.Mix<CF, "X", [XF1, XF]>,
      HKT.Mix<CF, "I", [IF1, IF]>,
      HKT.Mix<CF, "S", [SF1, SF]>,
      HKT.Mix<CF, "R", [RF1, RF]>,
      HKT.Mix<CF, "E", [EF1, EF]>,
      HKT.Kind<
         G,
         CG,
         HKT.Mix<CG, "N", [NG1, NG]>,
         HKT.Mix<CG, "K", [KG1, KG]>,
         HKT.Mix<CG, "Q", [QG1, QG]>,
         HKT.Mix<CG, "W", [WG1, WG]>,
         HKT.Mix<CG, "X", [XG1, XG]>,
         HKT.Mix<CG, "I", [IG1, IG]>,
         HKT.Mix<CG, "S", [SG1, SG]>,
         HKT.Mix<CG, "R", [RG1, RG]>,
         HKT.Mix<CG, "E", [EG1, EG]>,
         A
      >
   >;
}
