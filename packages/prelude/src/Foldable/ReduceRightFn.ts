import type * as HKT from "../HKT";

export interface ReduceRightFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(b: B, f: (a: A, b: B) => B): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => B;
}

export interface ReduceRightFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    b: B,
    f: (a: A, b: B) => B
  ): B;
}

export interface ReduceRightFnComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <A, B>(b: B, f: (a: A, b: B) => B): <
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
    GE
  >(
    fa: HKT.Kind<
      F,
      CF,
      FN,
      FK,
      FQ,
      FW,
      FX,
      FI,
      FS,
      FR,
      FE,
      HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>
    >
  ) => B;
}

export interface ReduceRightFnComposition_<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> {
  <
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
    fa: HKT.Kind<
      F,
      CF,
      FN,
      FK,
      FQ,
      FW,
      FX,
      FI,
      FS,
      FR,
      FE,
      HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, A>
    >,
    b: B,
    f: (a: A, b: B) => B
  ): B;
}
