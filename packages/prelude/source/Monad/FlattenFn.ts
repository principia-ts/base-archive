import type * as HKT from "../HKT";

export interface FlattenFn<F extends HKT.URIS, TC = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2>(
      mma: HKT.Kind<
         F,
         TC,
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
            TC,
            HKT.Intro<TC, "N", N2, N>,
            HKT.Intro<TC, "K", K2, K>,
            HKT.Intro<TC, "Q", Q2, Q>,
            HKT.Intro<TC, "W", W2, W>,
            HKT.Intro<TC, "X", X2, X>,
            HKT.Intro<TC, "I", I2, I>,
            HKT.Intro<TC, "S", S2, S>,
            HKT.Intro<TC, "R", R2, R>,
            HKT.Intro<TC, "E", E2, E>,
            A
         >
      >
   ): HKT.Kind<
      F,
      TC,
      HKT.Mix<TC, "N", [N2, N]>,
      HKT.Mix<TC, "K", [K2, K]>,
      HKT.Mix<TC, "Q", [Q2, Q]>,
      HKT.Mix<TC, "W", [W2, W]>,
      HKT.Mix<TC, "X", [X2, X]>,
      HKT.Mix<TC, "I", [I2, I]>,
      HKT.Mix<TC, "S", [S2, S]>,
      HKT.Mix<TC, "R", [R2, R]>,
      HKT.Mix<TC, "E", [E2, E]>,
      A
   >;
}

export interface FlattenFnComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
         TCF,
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
            TCG,
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
               TCF,
               HKT.Intro<TCF, "N", NF, NF1>,
               HKT.Intro<TCF, "K", KF, KF1>,
               HKT.Intro<TCF, "Q", QF, QF1>,
               HKT.Intro<TCF, "W", WF, WF1>,
               HKT.Intro<TCF, "X", XF, XF1>,
               HKT.Intro<TCF, "I", IF, IF1>,
               HKT.Intro<TCF, "S", SF, SF1>,
               HKT.Intro<TCF, "R", RF, RF1>,
               HKT.Intro<TCF, "E", EF, EF1>,
               HKT.Kind<
                  G,
                  TCG,
                  HKT.Intro<TCG, "N", NG, NG1>,
                  HKT.Intro<TCG, "K", KG, KG1>,
                  HKT.Intro<TCG, "Q", QG, QG1>,
                  HKT.Intro<TCG, "W", WG, WG1>,
                  HKT.Intro<TCG, "X", XG, XG1>,
                  HKT.Intro<TCG, "I", IG, IG1>,
                  HKT.Intro<TCG, "S", SG, SG1>,
                  HKT.Intro<TCG, "R", RG, RG1>,
                  HKT.Intro<TCG, "E", EG, EG1>,
                  A
               >
            >
         >
      >
   ): HKT.Kind<
      F,
      TCF,
      HKT.Mix<TCF, "N", [NF1, NF]>,
      HKT.Mix<TCF, "K", [KF1, KF]>,
      HKT.Mix<TCF, "Q", [QF1, QF]>,
      HKT.Mix<TCF, "W", [WF1, WF]>,
      HKT.Mix<TCF, "X", [XF1, XF]>,
      HKT.Mix<TCF, "I", [IF1, IF]>,
      HKT.Mix<TCF, "S", [SF1, SF]>,
      HKT.Mix<TCF, "R", [RF1, RF]>,
      HKT.Mix<TCF, "E", [EF1, EF]>,
      HKT.Kind<
         G,
         TCG,
         HKT.Mix<TCG, "N", [NG1, NG]>,
         HKT.Mix<TCG, "K", [KG1, KG]>,
         HKT.Mix<TCG, "Q", [QG1, QG]>,
         HKT.Mix<TCG, "W", [WG1, WG]>,
         HKT.Mix<TCG, "X", [XG1, XG]>,
         HKT.Mix<TCG, "I", [IG1, IG]>,
         HKT.Mix<TCG, "S", [SG1, SG]>,
         HKT.Mix<TCG, "R", [RG1, RG]>,
         HKT.Mix<TCG, "E", [EG1, EG]>,
         A
      >
   >;
}
