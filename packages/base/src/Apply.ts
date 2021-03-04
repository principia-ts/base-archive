import type { SemimonoidalFunctor, SemimonoidalFunctor2 } from './SemimonoidalFunctor'

import { pipe } from './Function'
import { getFunctorComposition } from './Functor'
import * as HKT from './HKT'

/**
 * A lax semimonoidal endofunctor
 *
 * `Apply` is isomorphic to `SemimonoidalFunctor`
 */
export interface Apply<F extends HKT.URIS, C = HKT.Auto> extends SemimonoidalFunctor<F, C> {
  readonly ap_: ApFn_<F, C>
  readonly ap: ApFn<F, C>
}

export interface Apply2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends SemimonoidalFunctor2<F, G, CF, CG> {
  readonly ap_: ApFn2_<F, G, CF, CG>
  readonly ap: ApFn2<F, G, CF, CG>
}

export function getApplyComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Apply<F, CF>,
  G: Apply<G, CG>
): Apply2<F, G, CF, CG>
export function getApplyComposition<F, G>(
  F: Apply<HKT.UHKT<F>>,
  G: Apply<HKT.UHKT<G>>
): Apply2<HKT.UHKT<F>, HKT.UHKT<G>> {
  const crossWith_: Apply2<HKT.UHKT<F>, HKT.UHKT<G>>['crossWith_'] = (fga, fgb, f) =>
    F.crossWith_(fga, fgb, (ga, gb) => G.crossWith_(ga, gb, f))

  const ap_: Apply2<HKT.UHKT<F>, HKT.UHKT<G>>['ap_'] = <A, B>(
    fgab: HKT.HKT<F, HKT.HKT<G, (a: A) => B>>,
    fga: HKT.HKT<F, HKT.HKT<G, A>>
  ): HKT.HKT<F, HKT.HKT<G, B>> =>
    pipe(
      fgab,
      F.map((gab) => (ga: HKT.HKT<G, A>) => G.ap_(gab, ga)),
      F.ap(fga)
    )
  return HKT.instance<Apply2<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getFunctorComposition(F, G),
    ap_,
    ap: (fga) => (fgab) => ap_(fgab, fga),
    crossWith_,
    crossWith: (fgb, f) => (fga) => crossWith_(fga, fgb, f)
  })
}

export interface ApFn<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>): <
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    B
  >(
    fab: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N, N1>,
      HKT.Intro<TC, 'K', K, K1>,
      HKT.Intro<TC, 'Q', Q, Q1>,
      HKT.Intro<TC, 'W', W, W1>,
      HKT.Intro<TC, 'X', X, X1>,
      HKT.Intro<TC, 'I', I, I1>,
      HKT.Intro<TC, 'S', S, S1>,
      HKT.Intro<TC, 'R', R, R1>,
      HKT.Intro<TC, 'E', E, E1>,
      (a: A) => B
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N, N1]>,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    HKT.Mix<TC, 'I', [I, I1]>,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    HKT.Mix<TC, 'E', [E, E1]>,
    B
  >
}

export interface ApFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fab: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, (a: A) => B>,
    fa: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N, N1>,
      HKT.Intro<TC, 'K', K, K1>,
      HKT.Intro<TC, 'Q', Q, Q1>,
      HKT.Intro<TC, 'W', W, W1>,
      HKT.Intro<TC, 'X', X, X1>,
      HKT.Intro<TC, 'I', I, I1>,
      HKT.Intro<TC, 'S', S, S1>,
      HKT.Intro<TC, 'R', R, R1>,
      HKT.Intro<TC, 'E', E, E1>,
      A
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N, N1]>,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    HKT.Mix<TC, 'I', [I, I1]>,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    HKT.Mix<TC, 'E', [E, E1]>,
    B
  >
}

export interface ApFn2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ): <
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
    B
  >(
    fgab: HKT.Kind<
      F,
      CF,
      HKT.Intro<CF, 'N', NF, NF1>,
      HKT.Intro<CF, 'K', KF, KF1>,
      HKT.Intro<CF, 'Q', QF, QF1>,
      HKT.Intro<CF, 'W', WF, WF1>,
      HKT.Intro<CF, 'X', XF, XF1>,
      HKT.Intro<CF, 'I', IF, IF1>,
      HKT.Intro<CF, 'S', SF, SF1>,
      HKT.Intro<CF, 'R', RF, RF1>,
      HKT.Intro<CF, 'E', EF, EF1>,
      HKT.Kind<
        G,
        CG,
        HKT.Intro<CG, 'N', NG, NG1>,
        HKT.Intro<CG, 'K', KG, KG1>,
        HKT.Intro<CG, 'Q', QG, QG1>,
        HKT.Intro<CG, 'W', WG, WG1>,
        HKT.Intro<CG, 'X', XG, XG1>,
        HKT.Intro<CG, 'I', IG, IG1>,
        HKT.Intro<CG, 'S', SG, SG1>,
        HKT.Intro<CG, 'R', RG, RG1>,
        HKT.Intro<CG, 'E', EG, EG1>,
        (a: A) => B
      >
    >
  ) => HKT.Kind<
    F,
    CF,
    HKT.Mix<CF, 'N', [NF, NF1]>,
    HKT.Mix<CF, 'K', [KF, KF1]>,
    HKT.Mix<CF, 'Q', [QF, QF1]>,
    HKT.Mix<CF, 'W', [WF, WF1]>,
    HKT.Mix<CF, 'X', [XF, XF1]>,
    HKT.Mix<CF, 'I', [IF, IF1]>,
    HKT.Mix<CF, 'S', [SF, SF1]>,
    HKT.Mix<CF, 'R', [RF, RF1]>,
    HKT.Mix<CF, 'E', [EF, EF1]>,
    HKT.Kind<
      G,
      CG,
      HKT.Mix<CG, 'N', [NG, NG1]>,
      HKT.Mix<CG, 'K', [KG, KG1]>,
      HKT.Mix<CG, 'Q', [QG, QG1]>,
      HKT.Mix<CG, 'W', [WG, WG1]>,
      HKT.Mix<CG, 'X', [XG, XG1]>,
      HKT.Mix<CG, 'I', [IG, IG1]>,
      HKT.Mix<CG, 'S', [SG, SG1]>,
      HKT.Mix<CG, 'R', [RG, RG1]>,
      HKT.Mix<CG, 'E', [EG, EG1]>,
      B
    >
  >
}

export interface ApFn2_<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
    A,
    B
  >(
    fgab: HKT.Kind<
      F,
      TCF,
      NF1,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, (a: A) => B>
    >,
    fga: HKT.Kind<
      F,
      TCF,
      HKT.Intro<TCF, 'N', NF1, NF>,
      HKT.Intro<TCF, 'K', KF1, KF>,
      HKT.Intro<TCF, 'Q', QF1, QF>,
      HKT.Intro<TCF, 'W', WF1, WF>,
      HKT.Intro<TCF, 'X', XF1, XF>,
      HKT.Intro<TCF, 'I', IF1, IF>,
      HKT.Intro<TCF, 'S', SF1, SF>,
      HKT.Intro<TCF, 'R', RF1, RF>,
      HKT.Intro<TCF, 'E', EF1, EF>,
      HKT.Kind<
        G,
        TCG,
        HKT.Intro<TCG, 'N', NG1, NG>,
        HKT.Intro<TCG, 'K', KG1, KG>,
        HKT.Intro<TCG, 'Q', QG1, QG>,
        HKT.Intro<TCG, 'W', WG1, WG>,
        HKT.Intro<TCG, 'X', XG1, XG>,
        HKT.Intro<TCG, 'I', IG1, IG>,
        HKT.Intro<TCG, 'S', SG1, SG>,
        HKT.Intro<TCG, 'R', RG1, RG>,
        HKT.Intro<TCG, 'E', EG1, EG>,
        A
      >
    >
  ): HKT.Kind<
    F,
    TCF,
    HKT.Mix<TCF, 'N', [NF, NF1]>,
    HKT.Mix<TCF, 'K', [KF, KF1]>,
    HKT.Mix<TCF, 'Q', [QF, QF1]>,
    HKT.Mix<TCF, 'W', [WF, WF1]>,
    HKT.Mix<TCF, 'X', [XF, XF1]>,
    HKT.Mix<TCF, 'I', [IF, IF1]>,
    HKT.Mix<TCF, 'S', [SF, SF1]>,
    HKT.Mix<TCF, 'R', [RF, RF1]>,
    HKT.Mix<TCF, 'E', [EF, EF1]>,
    HKT.Kind<
      G,
      TCG,
      HKT.Mix<TCG, 'N', [NG, NG1]>,
      HKT.Mix<TCG, 'K', [KG, KG1]>,
      HKT.Mix<TCG, 'Q', [QG, QG1]>,
      HKT.Mix<TCG, 'W', [WG, WG1]>,
      HKT.Mix<TCG, 'X', [XG, XG1]>,
      HKT.Mix<TCG, 'I', [IG, IG1]>,
      HKT.Mix<TCG, 'S', [SG, SG1]>,
      HKT.Mix<TCG, 'R', [RG, RG1]>,
      HKT.Mix<TCG, 'E', [EG, EG1]>,
      B
    >
  >
}
