import type { Functor, FunctorComposition } from './Functor'
import type { Semigroupal, SemigroupalComposition } from './Semigroupal'
import type { EnforceNonEmptyRecord } from './util/types'

import { tuple } from './Function'
import { getFunctorComposition } from './Functor'
import * as HKT from './HKT'

export interface Apply<F extends HKT.URIS, TC = HKT.Auto> extends Functor<F, TC>, Semigroupal<F, TC> {
  readonly ap: ApFn<F, TC>
  readonly ap_: ApFn_<F, TC>
  readonly map2: Map2Fn<F, TC>
  readonly map2_: Map2Fn_<F, TC>
}

export interface ApplyComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>
  extends FunctorComposition<F, G, TCF, TCG>,
    SemigroupalComposition<F, G, TCF, TCG> {
  readonly ap: ApFnComposition<F, G, TCF, TCG>
  readonly ap_: ApFnComposition_<F, G, TCF, TCG>
  readonly map2: Map2FnComposition<F, G, TCF, TCG>
  readonly map2_: Map2FnComposition_<F, G, TCF, TCG>
}

export function getApplyComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>(
  F: Apply<F, TCF>,
  G: Apply<G, TCG>
): ApplyComposition<F, G, TCF, TCG>
export function getApplyComposition<F, G>(F: Apply<HKT.UHKT<F>>, G: Apply<HKT.UHKT<G>>) {
  return HKT.instance<ApplyComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getFunctorComposition(F, G),
    product_: (fga, fgb) => F.map2_(fga, fgb, G.product_),
    product: (fgb) => (fga) => F.map2_(fga, fgb, G.product_),
    ap_: <A, B>(fgab: HKT.HKT<F, HKT.HKT<G, (a: A) => B>>, fga: HKT.HKT<F, HKT.HKT<G, A>>) =>
      F.ap(fga)(F.map_(fgab, (gab) => (ga: HKT.HKT<G, A>) => G.ap_(gab, ga))),
    ap: <A>(fga: HKT.HKT<F, HKT.HKT<G, A>>) => <B>(fgab: HKT.HKT<F, HKT.HKT<G, (a: A) => B>>) =>
      F.ap(fga)(F.map_(fgab, (gab) => (ga: HKT.HKT<G, A>) => G.ap_(gab, ga))),
    map2_: (fga, fgb, f) => F.map2_(fga, fgb, (ga, gb) => G.map2_(ga, gb, f)),
    map2: (fgb, f) => F.map2(fgb, (ga, gb) => G.map2_(ga, gb, f))
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

export interface ApFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
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

export interface ApFnComposition_<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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

export interface ApLeftFn<F extends HKT.URIS, TC = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >(
    fa: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N1, N>,
      HKT.Intro<TC, 'K', K1, K>,
      HKT.Intro<TC, 'Q', Q1, Q>,
      HKT.Intro<TC, 'W', W1, W>,
      HKT.Intro<TC, 'X', X1, X>,
      HKT.Intro<TC, 'I', I1, I>,
      HKT.Intro<TC, 'S', S1, S>,
      HKT.Intro<TC, 'R', R1, R>,
      HKT.Intro<TC, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N1, N]>,
    HKT.Mix<TC, 'K', [K1, K]>,
    HKT.Mix<TC, 'Q', [Q1, Q]>,
    HKT.Mix<TC, 'W', [W1, W]>,
    HKT.Mix<TC, 'X', [X1, X]>,
    HKT.Mix<TC, 'I', [I1, I]>,
    HKT.Mix<TC, 'S', [S1, S]>,
    HKT.Mix<TC, 'R', [R1, R]>,
    HKT.Mix<TC, 'E', [E1, E]>,
    A
  >
}

export interface ApLeftFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
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
      B
    >
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N1, N]>,
    HKT.Mix<TC, 'K', [K1, K]>,
    HKT.Mix<TC, 'Q', [Q1, Q]>,
    HKT.Mix<TC, 'W', [W1, W]>,
    HKT.Mix<TC, 'X', [X1, X]>,
    HKT.Mix<TC, 'I', [I1, I]>,
    HKT.Mix<TC, 'S', [S1, S]>,
    HKT.Mix<TC, 'R', [R1, R]>,
    HKT.Mix<TC, 'E', [E1, E]>,
    A
  >
}

export interface ApLeftFnComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
  <
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
    fgb: HKT.Kind<
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
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
    >
  ): <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
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
        B
      >
    >
  ) => HKT.Kind<
    F,
    TCF,
    HKT.Mix<TCF, 'N', [NF1, NF]>,
    HKT.Mix<TCF, 'K', [KF1, KF]>,
    HKT.Mix<TCF, 'Q', [QF1, QF]>,
    HKT.Mix<TCF, 'W', [WF1, WF]>,
    HKT.Mix<TCF, 'X', [XF1, XF]>,
    HKT.Mix<TCF, 'I', [IF1, IF]>,
    HKT.Mix<TCF, 'S', [SF1, SF]>,
    HKT.Mix<TCF, 'R', [RF1, RF]>,
    HKT.Mix<TCF, 'E', [EF1, EF]>,
    HKT.Kind<
      G,
      TCG,
      HKT.Mix<TCG, 'N', [NG1, NG]>,
      HKT.Mix<TCG, 'K', [KG1, KG]>,
      HKT.Mix<TCG, 'Q', [QG1, QG]>,
      HKT.Mix<TCG, 'W', [WG1, WG]>,
      HKT.Mix<TCG, 'X', [XG1, XG]>,
      HKT.Mix<TCG, 'I', [IG1, IG]>,
      HKT.Mix<TCG, 'S', [SG1, SG]>,
      HKT.Mix<TCG, 'R', [RG1, RG]>,
      HKT.Mix<TCG, 'E', [EG1, EG]>,
      A
    >
  >
}

export interface ApRightFn<F extends HKT.URIS, C = HKT.Auto> {
  <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>): <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    B
  >
}

export interface ApRightFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N, N1>,
      HKT.Intro<C, 'K', K, K1>,
      HKT.Intro<C, 'Q', Q, Q1>,
      HKT.Intro<C, 'W', W, W1>,
      HKT.Intro<C, 'X', X, X1>,
      HKT.Intro<C, 'I', I, I1>,
      HKT.Intro<C, 'S', S, S1>,
      HKT.Intro<C, 'R', R, R1>,
      HKT.Intro<C, 'E', E, E1>,
      B
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    B
  >
}

export interface ApRightFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <
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
    fgb: HKT.Kind<
      F,
      CF,
      NF1,
      KF1,
      QF1,
      WF1,
      XF1,
      IF1,
      SF1,
      RF1,
      EF1,
      HKT.Kind<G, CG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, A>
    >
  ): <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<
      F,
      CF,
      HKT.Intro<CF, 'N', NF1, NF>,
      HKT.Intro<CF, 'K', KF1, KF>,
      HKT.Intro<CF, 'Q', QF1, QF>,
      HKT.Intro<CF, 'W', WF1, WF>,
      HKT.Intro<CF, 'X', XF1, XF>,
      HKT.Intro<CF, 'I', IF1, IF>,
      HKT.Intro<CF, 'S', SF1, SF>,
      HKT.Intro<CF, 'R', RF1, RF>,
      HKT.Intro<CF, 'E', EF1, EF>,
      HKT.Kind<
        G,
        CG,
        HKT.Intro<CG, 'N', NG1, NG>,
        HKT.Intro<CG, 'K', KG1, KG>,
        HKT.Intro<CG, 'Q', QG1, QG>,
        HKT.Intro<CG, 'W', WG1, WG>,
        HKT.Intro<CG, 'X', XG1, XG>,
        HKT.Intro<CG, 'I', IG1, IG>,
        HKT.Intro<CG, 'S', SG1, SG>,
        HKT.Intro<CG, 'R', RG1, RG>,
        HKT.Intro<CG, 'E', EG1, EG>,
        B
      >
    >
  ) => HKT.Kind<
    F,
    CF,
    HKT.Mix<CF, 'N', [NF1, NF]>,
    HKT.Mix<CF, 'K', [KF1, KF]>,
    HKT.Mix<CF, 'Q', [QF1, QF]>,
    HKT.Mix<CF, 'W', [WF1, WF]>,
    HKT.Mix<CF, 'X', [XF1, XF]>,
    HKT.Mix<CF, 'I', [IF1, IF]>,
    HKT.Mix<CF, 'S', [SF1, SF]>,
    HKT.Mix<CF, 'R', [RF1, RF]>,
    HKT.Mix<CF, 'E', [EF1, EF]>,
    HKT.Kind<
      G,
      CG,
      HKT.Mix<CG, 'N', [NG1, NG]>,
      HKT.Mix<CG, 'K', [KG1, KG]>,
      HKT.Mix<CG, 'Q', [QG1, QG]>,
      HKT.Mix<CG, 'W', [WG1, WG]>,
      HKT.Mix<CG, 'X', [XG1, XG]>,
      HKT.Mix<CG, 'I', [IG1, IG]>,
      HKT.Mix<CG, 'S', [SG1, SG]>,
      HKT.Mix<CG, 'R', [RG1, RG]>,
      HKT.Mix<CG, 'E', [EG1, EG]>,
      B
    >
  >
}

export interface ApSFn<F extends HKT.URIS, C = HKT.Auto> {
  <BN extends string, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    name: Exclude<BN, keyof A>,
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, 'N', N1, N>,
      HKT.Intro<C, 'K', K1, K>,
      HKT.Intro<C, 'Q', Q1, Q>,
      HKT.Intro<C, 'W', W1, W>,
      HKT.Intro<C, 'X', X1, X>,
      HKT.Intro<C, 'I', I1, I>,
      HKT.Intro<C, 'S', S1, S>,
      HKT.Intro<C, 'R', R1, R>,
      HKT.Intro<C, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export interface LiftA2Fn<F extends HKT.URIS, TC = HKT.Auto> {
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
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
  ) => (
    fb: HKT.Kind<
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
      B
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
    D
  >
}

export interface MapNFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    B,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ): (
    ...t: KT
  ) => HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    B
  >
}

export interface MapNFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    ...t: KT
  ): <B>(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ) => HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    B
  >
}

/**
 * ```haskell
 * mapNF :: Apply f => ([a, b, ...] -> c) -> [f a, f b, ...] -> f c
 * ```
 *
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF<F extends HKT.URIS, C = HKT.Auto>(A: Apply<F, C>): MapNFn<F, C>
export function mapNF<F>(F: Apply<HKT.UHKT<F>>): MapNFn<HKT.UHKT<F>> {
  return (f) => (...t) => F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

/**
 * ```haskell
 * mapNF_ :: Apply f => (fa, fb, ...) -> ([a, b, ...] -> c) -> f c
 * ```
 *
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF_<F extends HKT.URIS, C = HKT.Auto>(A: Apply<F, C>): MapNFn_<F, C>
export function mapNF_<F>(F: Apply<HKT.UHKT<F>>): MapNFn_<HKT.UHKT<F>> {
  return (...t) => (f) => F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

export interface SequenceSFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KS extends Readonly<
      Record<
        string,
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    >,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    r: EnforceNonEmptyRecord<KS> &
      Readonly<
        Record<
          string,
          HKT.Kind<
            F,
            TC,
            HKT.Intro<TC, 'N', N, any>,
            HKT.Intro<TC, 'K', K, any>,
            HKT.Intro<TC, 'Q', Q, any>,
            HKT.Intro<TC, 'W', W, any>,
            HKT.Intro<TC, 'X', X, any>,
            HKT.Intro<TC, 'I', I, any>,
            HKT.Intro<TC, 'S', S, any>,
            HKT.Intro<TC, 'R', R, any>,
            HKT.Intro<TC, 'E', E, any>,
            unknown
          >
        >
      >
  ): HKT.Kind<
    F,
    TC,
    InferMixStruct<F, TC, 'N', N, KS>,
    InferMixStruct<F, TC, 'K', K, KS>,
    InferMixStruct<F, TC, 'Q', Q, KS>,
    InferMixStruct<F, TC, 'W', W, KS>,
    InferMixStruct<F, TC, 'X', X, KS>,
    InferMixStruct<F, TC, 'I', I, KS>,
    InferMixStruct<F, TC, 'S', S, KS>,
    InferMixStruct<F, TC, 'R', R, KS>,
    InferMixStruct<F, TC, 'E', E, KS>,
    {
      [K in keyof KS]: HKT.Infer<F, TC, 'A', KS[K]>
    }
  >
}

export function sequenceSF<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>): SequenceSFn<F, C>
export function sequenceSF<F>(F: Apply<HKT.UHKT<F>>): SequenceSFn<HKT.UHKT<F>> {
  return (r) => {
    const keys = Object.keys(r)
    const len  = keys.length
    const f    = getRecordConstructor(keys)
    let fr     = F.map_(r[keys[0]], f)
    for (let i = 1; i < len; i++) {
      fr = F.ap_(fr, r[keys[i]]) as any
    }
    return fr
  }
}

export interface SequenceTFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    ...t: KT
  ): HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    {
      [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]>
    }
  >
}

export function sequenceTF<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>): SequenceTFn<F, C>
export function sequenceTF<F>(F: Apply<HKT.UHKT<F>>): SequenceTFn<HKT.UHKT<F>> {
  return (...t) => {
    const len = t.length
    const f   = getTupleConstructor(len)
    let fas   = F.map_(t[0], f)
    for (let i = 1; i < len; i++) {
      fas = F.ap_(fas, t[i]) as any
    }
    return fas as any
  }
}

export interface Map2Fn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, TC, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (a: A, b: B) => C
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, 'N', N1, N>,
      HKT.Intro<TC, 'K', K1, K>,
      HKT.Intro<TC, 'Q', Q1, Q>,
      HKT.Intro<TC, 'W', W1, W>,
      HKT.Intro<TC, 'X', X1, X>,
      HKT.Intro<TC, 'I', I1, I>,
      HKT.Intro<TC, 'S', S1, S>,
      HKT.Intro<TC, 'R', R1, R>,
      HKT.Intro<TC, 'E', E1, E>,
      A
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N1, N]>,
    HKT.Mix<TC, 'K', [K1, K]>,
    HKT.Mix<TC, 'Q', [Q1, Q]>,
    HKT.Mix<TC, 'W', [W1, W]>,
    HKT.Mix<TC, 'X', [X1, X]>,
    HKT.Mix<TC, 'I', [I1, I]>,
    HKT.Mix<TC, 'S', [S1, S]>,
    HKT.Mix<TC, 'R', [R1, R]>,
    HKT.Mix<TC, 'E', [E1, E]>,
    C
  >
}

export interface Map2Fn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    fb: HKT.Kind<
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
      B
    >,
    f: (a: A, b: B) => C
  ): HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, 'N', [N, N1]>,
    HKT.Mix<TC, 'K', [K, K1]>,
    HKT.Mix<TC, 'Q', [Q, Q1]>,
    HKT.Mix<TC, 'W', [W, W1]>,
    HKT.Mix<TC, 'X', [X, X1]>,
    HKT.Mix<TC, 'I', [I1, I1]>,
    HKT.Mix<TC, 'S', [S, S1]>,
    HKT.Mix<TC, 'R', [R, R1]>,
    HKT.Mix<TC, 'E', [E, E1]>,
    C
  >
}

export interface Map2FnComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
  <
    A,
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
    B,
    C
  >(
    fgb: HKT.Kind<
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
      HKT.Kind<G, TCG, NG1, KG1, QG1, WG1, XG1, IG1, SG1, RG1, EG1, B>
    >,
    f: (a: A, b: B) => C
  ): <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG>(
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
  ) => HKT.Kind<
    F,
    TCF,
    HKT.Mix<TCF, 'N', [NF1, NF]>,
    HKT.Mix<TCF, 'K', [KF1, KF]>,
    HKT.Mix<TCF, 'Q', [QF1, QF]>,
    HKT.Mix<TCF, 'W', [WF1, WF]>,
    HKT.Mix<TCF, 'X', [XF1, XF]>,
    HKT.Mix<TCF, 'I', [IF1, IF]>,
    HKT.Mix<TCF, 'S', [SF1, SF]>,
    HKT.Mix<TCF, 'R', [RF1, RF]>,
    HKT.Mix<TCF, 'E', [EF1, EF]>,
    HKT.Kind<
      G,
      TCG,
      HKT.Mix<TCG, 'N', [NG1, NG]>,
      HKT.Mix<TCG, 'K', [KG1, KG]>,
      HKT.Mix<TCG, 'Q', [QG1, QG]>,
      HKT.Mix<TCG, 'W', [WG1, WG]>,
      HKT.Mix<TCG, 'X', [XG1, XG]>,
      HKT.Mix<TCG, 'I', [IG1, IG]>,
      HKT.Mix<TCG, 'S', [SG1, SG]>,
      HKT.Mix<TCG, 'R', [RG1, RG]>,
      HKT.Mix<TCG, 'E', [EG1, EG]>,
      C
    >
  >
}

export interface Map2FnComposition_<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
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
    B,
    C
  >(
    fga: HKT.Kind<F, TCF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, TCG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    fgb: HKT.Kind<
      F,
      TCF,
      HKT.Intro<TCF, 'N', NF, NF1>,
      HKT.Intro<TCF, 'K', KF, KF1>,
      HKT.Intro<TCF, 'Q', QF, QF1>,
      HKT.Intro<TCF, 'W', WF, WF1>,
      HKT.Intro<TCF, 'X', XF, XF1>,
      HKT.Intro<TCF, 'I', IF, IF1>,
      HKT.Intro<TCF, 'S', SF, SF1>,
      HKT.Intro<TCF, 'R', RF, RF1>,
      HKT.Intro<TCF, 'E', EF, EF1>,
      HKT.Kind<
        G,
        TCG,
        HKT.Intro<TCG, 'N', NG, NG1>,
        HKT.Intro<TCG, 'K', KG, KG1>,
        HKT.Intro<TCG, 'Q', QG, QG1>,
        HKT.Intro<TCG, 'W', WG, WG1>,
        HKT.Intro<TCG, 'X', XG, XG1>,
        HKT.Intro<TCG, 'I', IG, IG1>,
        HKT.Intro<TCG, 'S', SG, SG1>,
        HKT.Intro<TCG, 'R', RG, RG1>,
        HKT.Intro<TCG, 'E', EG, EG1>,
        B
      >
    >,
    f: (a: A, b: B) => C
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
      C
    >
  >
}

/*
 * -------------------------------------------
 * internal
 * -------------------------------------------
 */

/**
 * @internal
 */
function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const combined = Array(acc.length + 1)
    for (let i = 0; i < acc.length; i++) {
      combined[i] = acc[i]
    }
    combined[acc.length] = x
    /* eslint-disable-next-line prefer-spread */
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
  }
}
/**
 * @internal
 */
const tupleConstructors: Record<number, (a: unknown) => any> = {
  1: (a) => [a],
  2: (a) => (b: any) => [a, b],
  3: (a) => (b: any) => (c: any) => [a, b, c],
  4: (a) => (b: any) => (c: any) => (d: any) => [a, b, c, d],
  5: (a) => (b: any) => (c: any) => (d: any) => (e: any) => [a, b, c, d, e]
}

/**
 * @internal
 */
function getTupleConstructor(len: number): (a: unknown) => any {
  /* eslint-disable-next-line no-prototype-builtins */
  if (!tupleConstructors.hasOwnProperty(len)) {
    tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return tupleConstructors[len]
}

/**
 * @internal
 */
function getRecordConstructor(keys: ReadonlyArray<string>) {
  const len = keys.length
  switch (len) {
    case 1:
      return (a: any) => ({ [keys[0]]: a })
    case 2:
      return (a: any) => (b: any) => ({ [keys[0]]: a, [keys[1]]: b })
    case 3:
      return (a: any) => (b: any) => (c: any) => ({ [keys[0]]: a, [keys[1]]: b, [keys[2]]: c })
    case 4:
      return (a: any) => (b: any) => (c: any) => (d: any) => ({
        [keys[0]]: a,
        [keys[1]]: b,
        [keys[2]]: c,
        [keys[3]]: d
      })
    case 5:
      return (a: any) => (b: any) => (c: any) => (d: any) => (e: any) => ({
        [keys[0]]: a,
        [keys[1]]: b,
        [keys[2]]: c,
        [keys[3]]: d,
        [keys[4]]: e
      })
    default:
      return curried(
        (...args: ReadonlyArray<unknown>) => {
          const r: Record<string, unknown> = {}
          for (let i = 0; i < len; i++) {
            r[keys[i]] = args[i]
          }
          return r
        },
        len - 1,
        []
      )
  }
}

/**
 * @internal
 */
type InferMixStruct<F extends HKT.URIS, TC, P extends HKT.Param, T, KS> = HKT.MixStruct<
  TC,
  P,
  T,
  { [K in keyof KS]: HKT.Infer<F, TC, P, KS[K]> }
>

/**
 * @internal
 */
type InferMixTuple<F extends HKT.URIS, TC, P extends HKT.Param, T, KT> = HKT.MixStruct<
  TC,
  P,
  T,
  { [K in keyof KT & number]: HKT.Infer<F, TC, P, KT[K]> }
>
