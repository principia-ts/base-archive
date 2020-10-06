import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";

export interface TraverseF<F extends HKT.URIS, CF = HKT.Auto> {
   <G extends HKT.URIS, CG = HKT.Auto>(A: Applicative<G, CG>): <
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
      f: (a: A) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, B>
   ) => <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE>(
      ta: HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
   ) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>>;
}

export interface UC_TraverseF<F extends HKT.URIS, CF = HKT.Auto> {
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
   ) => HKT.Kind<G, CG, GN, GK, GQ, GW, GX, GI, GS, GR, GE, HKT.Kind<F, CF, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>>;
}

export interface TraverseFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
   <H extends HKT.URIS, CH = HKT.Auto>(A: Applicative<H, CH>): <
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
   >;
}

export interface UC_TraverseFComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
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
   >;
}

export function implementUCTraverse<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
      A: A;
      B: B;
      G: G;
      N: N;
      K: K;
      Q: Q;
      W: W;
      X: X;
      I: I;
      S: S;
      R: R;
      E: E;
   }) => (
      G: Applicative<HKT.UHKT<G>>
   ) => (
      ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
      f: (a: A) => HKT.HKT<G, B>
   ) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>>
) => UC_TraverseF<F, C>;
export function implementUCTraverse() {
   return (i: any) => i();
}

export function implementTraverse<F extends HKT.URIS, C = HKT.Auto>(): (
   i: <N extends string, K, Q, W, X, I, S, R, E, A, B, G>(_: {
      A: A;
      B: B;
      G: G;
      N: N;
      K: K;
      Q: Q;
      W: W;
      X: X;
      I: I;
      S: S;
      R: R;
      E: E;
   }) => (
      G: Applicative<HKT.UHKT<G>>
   ) => (
      f: (a: A) => HKT.HKT<G, B>
   ) => (ta: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => HKT.HKT<G, HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>>
) => TraverseF<F, C>;
export function implementTraverse() {
   return (i: any) => i();
}
