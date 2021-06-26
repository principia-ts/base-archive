import type { Applicative } from './Applicative'
import type { FoldableMin } from './Foldable'
import type { Functor2, FunctorMin } from './Functor'
import type { Monad } from './Monad'

import { Foldable } from './Foldable'
import { flow, identity } from './function'
import { Functor, getFunctorComposition } from './Functor'
import * as HKT from './HKT'
import * as F from './SafeFunction'
import { getStateT } from './StateT'

export interface Traversable<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C>, Foldable<F, C> {
  readonly traverse_: TraverseFn_<F, C>
  readonly traverse: TraverseFn<F, C>
  readonly sequence: SequenceFn<F, C>
}

export type TraversableMin<F extends HKT.URIS, C = HKT.Auto> = FunctorMin<F, C> &
  FoldableMin<F, C> & {
    readonly traverse_: TraverseFn_<F, C>
  }

export function Traversable<F extends HKT.URIS, C = HKT.Auto>(F: TraversableMin<F, C>): Traversable<F, C> {
  const sequence: SequenceFn<F, C> = (A) => {
    const traverseA_ = F.traverse_(A)
    return (ta) => traverseA_(ta, identity)
  }
  return HKT.instance<Traversable<F, C>>({
    ...Functor(F),
    ...Foldable(F),
    traverse_: F.traverse_,
    traverse: (A) => {
      const traverseA_ = F.traverse_(A)
      return (f) => (ta) => traverseA_(ta, f)
    },
    sequence
  })
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
  <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <GN extends string, GK, GQ, GW, GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>
  ) => <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
}

export interface TraverseFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <
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
  <H extends HKT.URIS, CH = HKT.Auto>(A: Applicative<H, CH>): <HN extends string, HK, HQ, HW, HX, HI, HS, HR, HE, A, B>(
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
  <H extends HKT.URIS, CH = HKT.Auto>(A: Applicative<H, CH>): <
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
    G: Applicative<HKT.UHKT<G>>
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
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, B>
  ) => (ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>>
) => TraverseFn<F, C>
export function implementTraverse() {
  return (i: any) => i()
}

export interface SequenceFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <
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
  <H extends HKT.URIS, CH = HKT.Auto>(A: Applicative<H, CH>): <
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
    G: Applicative<HKT.UHKT<G>>
  ) => (
    ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, HKT.HKT<G, A>>
  ) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>>
) => SequenceFn<F, C>
export function implementSequence() {
  return (i: any) => i()
}

export interface MapAccumMFn_<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(M: Monad<G, CG>): <
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
    B,
    C
  >(
    ta: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>,
    s: C,
    f: (s: C, a: A) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [B, C]>
  ) => HKT.Kind<
    G,
    CG,
    GN,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    readonly [HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>, C]
  >
}

export function mapAccumMF_<F extends HKT.URIS, C = HKT.Auto>(T: Traversable<F, C>): MapAccumMFn_<F, C> {
  return (M) => {
    const StateM          = getStateT(M)
    const traverseStateM_ = T.traverse_(StateM)
    return (ta, s0, f) => traverseStateM_(ta, (a) => F.single((s: typeof s0) => f(s, a))).run(s0 as any)
  }
}

export interface MapAccumMFn<F extends HKT.URIS, CF = HKT.Auto> {
  <G extends HKT.URIS, CG = HKT.Auto>(M: Monad<G, CG>): <GN extends string, GK, GQ, GW, GX, GI, GS, GR, GE, A, B, C>(
    s: C,
    f: (s: C, a: A) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, readonly [B, C]>
  ) => <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<
    G,
    CG,
    GN,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    readonly [HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>, C]
  >
}

export function mapAccumMF<F extends HKT.URIS, C = HKT.Auto>(T: Traversable<F, C>): MapAccumMFn<F, C> {
  return (M) => {
    const mapAccumM_ = mapAccumMF_(T)(M)
    return (s, f) => (ta) => mapAccumM_(ta, s, f)
  }
}
