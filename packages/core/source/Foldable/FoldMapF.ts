import type * as HKT from "../HKT";
import type { Monoid } from "../Monoid";

export interface FoldMapF<F extends HKT.URIS, C = HKT.Auto> {
   <M>(M: Monoid<M>): <A>(
      f: (a: A) => M
   ) => <N extends string, K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => M;
}

export interface UC_FoldMapF<F extends HKT.URIS, C = HKT.Auto> {
   <M>(M: Monoid<M>): <N extends string, K, Q, W, X, I, S, R, E, A>(
      fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      f: (a: A) => M
   ) => M;
}

export interface FoldMapFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <M>(M: Monoid<M>): <A>(
      f: (a: A) => M
   ) => <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
      fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
   ) => M;
}

export interface UC_FoldMapFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <M>(M: Monoid<M>): <
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
      A
   >(
      fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
      f: (a: A) => M
   ) => M;
}
