import * as HKT from "../HKT";

export interface ReduceF<F extends HKT.URIS, C = HKT.Auto> {
   <A, B>(b: B, f: (b: B, a: A) => B): <N extends string, K, Q, W, X, I, S, R, E>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
   ) => B;
}

export interface UC_ReduceF<F extends HKT.URIS, C = HKT.Auto> {
   <N extends string, K, Q, W, X, I, S, R, E, A, B>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      b: B,
      f: (b: B, a: A) => B
   ): B;
}

export interface ReduceFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <A, B>(b: B, f: (b: B, a: A) => B): <
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
      fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
   ) => B;
}

export interface UC_ReduceFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
      fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
      b: B,
      f: (b: B, a: A) => B
   ): B;
}
