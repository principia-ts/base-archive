import * as HKT from './HKT'

export interface Invariant<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
  readonly imap_: IMapFn_<F, TC>
  readonly imap: IMapFn<F, TC>
}

export interface InvariantComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly imap_: IMapFnComposition_<F, G, CF, CG>
  readonly imap: IMapFnComposition<F, G, CF, CG>
}

export function getInvariantComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Invariant<F, CF>,
  G: Invariant<G, CG>
): InvariantComposition<F, G, CF, CG>
export function getInvariantComposition<F, G>(F: Invariant<HKT.UHKT<F>>, G: Invariant<HKT.UHKT<G>>) {
  return HKT.instance<InvariantComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    imap_: (fga, f, g) => F.imap_(fga, G.imap(f, g), G.imap(g, f)),
    imap: (f, g) => F.imap(G.imap(f, g), G.imap(g, f))
  })
}

export interface IMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => B, g: (b: B) => A): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface IMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => B,
    g: (b: B) => A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface IMapFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <A, B>(f: (a: A) => B, g: (b: B) => A): <
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
  ) => HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}

export interface IMapFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    f: (a: A) => B,
    g: (b: B) => A
  ): HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, B>>
}
