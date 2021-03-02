import type { Functor, Functor2 } from './Functor'
import type { Monoidal } from './Monoidal'

import { flow } from './Function'
import { getFunctorComposition } from './Functor'
import * as HKT from './HKT'

export interface Traversable<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly traverse_: TraverseFn_<F, C>
  readonly traverse: TraverseFn<F, C>
  readonly sequence: SequenceFn<F, C>
}

export interface TraversableComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends Functor2<F, G, CF, CG> {
  readonly traverse_: TraverseFnComposition_<F, G, CF, CG>
  readonly traverse: TraverseFnComposition<F, G, CF, CG>
  readonly sequence: SequenceFnComposition<F, G, CF, CG>
}

export function getTraversableComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Traversable<F, CF>,
  G: Traversable<G, CG>
): TraversableComposition<F, G, CF, CG> {
  const traverse_: TraversableComposition<F, G, CF, CG>['traverse_'] = (H) => (tfga, f) =>
    F.traverse_(H)(tfga, (tga) => G.traverse_(H)(tga, f))
  return HKT.instance<TraversableComposition<F, G, CF, CG>>({
    ...getFunctorComposition(F, G),
    traverse_,
    traverse: (H) => flow(G.traverse(H), F.traverse(H)),
    sequence: (H) => flow(F.map(G.sequence(H)), F.sequence(H))
  })
}

export interface TraverseFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Monoidal<G, CG>): <GN extends string, GK, GQ, GW, GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>
  ) => <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
}

export interface TraverseFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Monoidal<G, CG>): <
    FN extends string,
    FK,
    FQ,
    FW,
    FX,
    FI,
    FS,
    FR,
    FE,
    GN extends string,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B
  >(
    ta: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    f: (a: A) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>
  ) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
}

export interface TraverseFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <H extends HKT.URIS, CH = HKT.Auto>(A: Monoidal<H, CH>): <HN extends string, HK, HQ, HW, HX, HI, HS, HR, HE, A, B>(
    f: (a: A) => HKT.Kind<H, CH, HN, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE, GN extends string, GK, GQ, GW, GX, GI, GS, GR, GE>(
    fga: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>>
  ) => HKT.Kind<
    H,
    CH,
    HN,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>>
  >
}

export interface TraverseFnComposition_<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <H extends HKT.URIS, CH = HKT.Auto>(A: Monoidal<H, CH>): <
    FN extends string,
    FK,
    FQ,
    FW,
    FX,
    FI,
    FS,
    FR,
    FE,
    GN extends string,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    HN extends string,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    A,
    B
  >(
    fga: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>>,
    f: (a: A) => HKT.Kind<H, CH, HN, HK, HQ, HW, HX, HI, HS, HR, HE, B>
  ) => HKT.Kind<
    H,
    CH,
    HN,
    HK,
    HQ,
    HW,
    HX,
    HI,
    HS,
    HR,
    HE,
    HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>>
  >
}

export function implementTraverse_<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
    A: A
    B: B
    G: G
    N: N
    K: K
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: E
  }) => (
    G: Monoidal<HKT.UHKT<G>>
  ) => (
    ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => HKT.HKT<G, B>
  ) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>>
) => TraverseFn_<F, C>
export function implementTraverse_() {
  return (i: any) => i()
}

export function implementTraverse<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
    A: A
    B: B
    G: G
    N: N
    K: K
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: E
  }) => (
    G: Monoidal<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, B>
  ) => (ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>>
) => TraverseFn<F, C>
export function implementTraverse() {
  return (i: any) => i()
}

export interface SequenceFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Monoidal<G, CG>): <
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
    ta: HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  ) => HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>>
}

export interface SequenceFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <H extends HKT.URIS, CH = HKT.Auto>(A: Monoidal<H, CH>): <
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
    NH extends string,
    KH,
    QH,
    WH,
    XH,
    IH,
    SH,
    RH,
    EH,
    A
  >(
    fgha: HKT.Kind<
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
      HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, HKT.Kind<H, CH, NH, KH, QH, WH, XH, IH, SH, RH, EH, A>>
    >
  ) => HKT.Kind<
    H,
    CH,
    NH,
    KH,
    QH,
    WH,
    XH,
    IH,
    SH,
    RH,
    EH,
    HKT.Kind<F, CF, NF, KF, QF, WF, XF, IF, SF, RF, EF, HKT.Kind<G, CG, NG, KG, QG, WG, XG, IG, SG, RG, EG, A>>
  >
}

export function implementSequence<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
    A: A
    B: B
    G: G
    N: N
    K: K
    Q: Q
    W: W
    X: X
    I: I
    S: S
    R: R
    E: E
  }) => (
    G: Monoidal<HKT.UHKT<G>>
  ) => (
    ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, HKT.HKT<G, A>>
  ) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>>
) => SequenceFn<F, C>
export function implementSequence() {
  return (i: any) => i()
}
