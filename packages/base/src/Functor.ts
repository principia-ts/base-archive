import type { Invariant, InvariantComposition } from './Invariant'

import * as HKT from './HKT'
import { getInvariantComposition } from './Invariant'

export interface Functor<F extends HKT.URIS, C = HKT.Auto> extends Invariant<F, C> {
  readonly map: MapFn<F, C>
  readonly map_: MapFn_<F, C>
}

export interface FunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends InvariantComposition<F, G, CF, CG> {
  readonly map: MapFnComposition<F, G, CF, CG>
  readonly map_: MapFnComposition_<F, G, CF, CG>
}

export function getFunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Functor<F, CF>,
  G: Functor<G, CG>
): FunctorComposition<F, G, CF, CG>
export function getFunctorComposition<F, G>(F: Functor<HKT.UHKT<F>>, G: Functor<HKT.UHKT<G>>) {
  const map_ = <A, B>(fga: HKT.HKT<F, HKT.HKT<G, A>>, f: (a: A) => B): HKT.HKT<F, HKT.HKT<G, B>> =>
    F.map_(fga, G.map(f))
  return HKT.instance<FunctorComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getInvariantComposition(F, G),
    map: (f) => (fga) => map_(fga, f),
    map_
  })
}

export interface MapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => B): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface MapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface MapFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(f: (a: A) => B): <
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
    fa: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface MapFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fa: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B
  ): HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}
