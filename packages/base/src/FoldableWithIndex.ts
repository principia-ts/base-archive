import type { Monoid } from './Monoid'

import * as HKT from './HKT'

export interface FoldableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly foldLeftWithIndex_: FoldLeftWithIndexFn_<F, C>
  readonly foldLeftWithIndex: FoldLeftWithIndexFn<F, C>
  readonly foldMapWithIndex_: FoldMapWithIndexFn_<F, C>
  readonly foldMapWithIndex: FoldMapWithIndexFn<F, C>
  readonly foldRightWithIndex_: FoldRightWithIndexFn_<F, C>
  readonly foldRightWithIndex: FoldRightWithIndexFn<F, C>
}

export interface FoldableWithIndexComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly foldLeftWithIndex_: FoldLeftWithIndexFnComposition_<F, G, CF, CG>
  readonly foldLeftWithIndex: FoldLeftWithIndexFnComposition<F, G, CF, CG>
  readonly foldMapWithIndex_: FoldMapWithIndexFnComposition_<F, G, CF, CG>
  readonly foldMapWithIndex: FoldMapWithIndexFnComposition<F, G, CF, CG>
  readonly foldRightWithIndex_: FoldRightWithIndexFnComposition_<F, G, CF, CG>
  readonly foldRightWithIndex: FoldRightWithIndexFnComposition<F, G, CF, CG>
}

export function getFoldableWithIndexComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: FoldableWithIndex<F, CF>,
  G: FoldableWithIndex<G, CG>
): FoldableWithIndexComposition<F, G, CF, CG>
export function getFoldableWithIndexComposition<F, G>(
  F: FoldableWithIndex<HKT.UHKT<F>>,
  G: FoldableWithIndex<HKT.UHKT<G>>
) {
  const foldLeftWithIndex_: FoldLeftWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    b: B,
    f: (b: B, k: [KF, KG], a: A) => B
  ) =>
      F.foldLeftWithIndex_(fga, b, (b: B, fi: KF, ga: HKT.HKT<G, A>) =>
        G.foldLeftWithIndex_(ga, b, (b: B, gi: KG, a: A) => f(b, [fi, gi], a))
      )

  const foldMapWithIndex_: FoldMapWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <M>(M: Monoid<M>) => <KF, KG, A>(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    f: (k: [KF, KG], a: A) => M
  ) => F.foldMapWithIndex_(M)(fga, (kf: KF, ga) => G.foldMapWithIndex_(M)(ga, (kg: KG, a) => f([kf, kg], a)))

  const foldRightWithIndex_: FoldRightWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    b: B,
    f: (a: A, k: [KF, KG], b: B) => B
  ) =>
      F.foldRightWithIndex_(fga, b, (ga: HKT.HKT<G, A>, fi: KF, b) =>
        G.foldRightWithIndex_(ga, b, (a: A, gi: KG, b) => f(a, [fi, gi], b))
      )
  return HKT.instance<FoldableWithIndexComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    foldLeftWithIndex_,
    foldMapWithIndex_,
    foldRightWithIndex_,
    foldLeftWithIndex: (b, f) => (fga) => foldLeftWithIndex_(fga, b, f),
    foldMapWithIndex: (M) => (f) => (fga) => foldMapWithIndex_(M)(fga, f),
    foldRightWithIndex: (b, f) => (fga) => foldRightWithIndex_(fga, b, f)
  })
}

export interface FoldLeftWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (b: B, i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => B
  ): <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
}

export interface FoldLeftWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (b: B, i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => B
  ): B
}

export interface FoldLeftWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, NG extends string, KF, KG, A, B>(
    b: B,
    f: (
      b: B,
      i: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => B
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => B
}

export interface FoldLeftWithIndexFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: B,
    f: (
      b: B,
      i: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => B
  ): B
}

export interface FoldRightWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, b: B) => B
  ): <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
}

export interface FoldRightWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (a: A, k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, b: B) => B
  ): B
}

export interface FoldRightWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <NF extends string, NG extends string, KF, KG, A, B>(
    b: B,
    f: (
      a: A,
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      b: B
    ) => B
  ): <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => B
}

export interface FoldRightWithIndexFnComposition_<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, NG extends string, KG, QG, WG, XG, IG, SG, RG, EG, A, B>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>,
    b: B,
    f: (
      a: A,
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      b: B
    ) => B
  ): B
}

export interface FoldMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <N extends string, K, A>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => M
  ) => <Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => M
}

export interface FoldMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <M>(M: Monoid<M>): <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (k: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => M
  ) => M
}

export interface FoldMapWithIndexFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <M>(M: Monoid<M>): <NF extends string, NG extends string, KF, KG, A>(
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => M
  ) => <QF, WF, XF, IF, SF, RF, EF, QG, WG, XG, IG, SG, RG, EG>(
    fga: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => M
}

export interface FoldMapWithIndexFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
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
    f: (
      k: [
        HKT.IndexFor<F, HKT.OrFix<'N', CF, NF>, HKT.OrFix<'K', CF, KF>>,
        HKT.IndexFor<G, HKT.OrFix<'N', CG, NG>, HKT.OrFix<'K', CG, KG>>
      ],
      a: A
    ) => M
  ) => M
}
