import type * as HKT from "../HKT";

/**
 * "unit" function type
 */
export interface UnitF<F extends HKT.URIS, C = HKT.Auto> {
   <
      N extends string = HKT.Initial<C, "N">,
      K = HKT.Initial<C, "K">,
      Q = HKT.Initial<C, "Q">,
      W = HKT.Initial<C, "W">,
      X = HKT.Initial<C, "X">,
      I = HKT.Initial<C, "I">,
      S = HKT.Initial<C, "S">,
      R = HKT.Initial<C, "R">,
      E = HKT.Initial<C, "E">
   >(): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, void>;
}

export interface AnyFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <
      NF extends string = HKT.Initial<CF, "N">,
      KF = HKT.Initial<CF, "K">,
      QF = HKT.Initial<CF, "Q">,
      WF = HKT.Initial<CF, "W">,
      XF = HKT.Initial<CF, "X">,
      IF = HKT.Initial<CF, "I">,
      SF = HKT.Initial<CF, "S">,
      RF = HKT.Initial<CF, "R">,
      EF = HKT.Initial<CF, "E">,
      NG extends string = HKT.Initial<CG, "N">,
      KG = HKT.Initial<CG, "K">,
      QG = HKT.Initial<CG, "Q">,
      WG = HKT.Initial<CG, "W">,
      XG = HKT.Initial<CG, "X">,
      IG = HKT.Initial<CG, "I">,
      SG = HKT.Initial<CG, "S">,
      RG = HKT.Initial<CG, "R">,
      EG = HKT.Initial<CG, "E">
   >(): HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, void>>;
}
