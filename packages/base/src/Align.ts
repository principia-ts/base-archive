import type * as HKT from './HKT'
import type { Option } from './Option'
import type { These } from './These'
import type { Semigroup } from './typeclass'

export interface Align<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly align_: AlignFn_<F, C>
  readonly align: AlignFn<F, C>
}

export interface AlignFn_<F extends HKT.URIS, C = HKT.Auto> {
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
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    These<A, B>
  >
}

export interface AlignFn<F extends HKT.URIS, C = HKT.Auto> {
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
    These<A, B>
  >
}

export interface AlignWithFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
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
    >,
    f: (th: These<A, B>) => C
  ): HKT.Kind<
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
    C
  >
}

export interface AlignWithFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (th: These<A, B>) => C
  ): <N extends string, K, Q, W, X, I, S, R, E, A>(
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
    C
  >
}

export interface AlignCombineFn_<F extends HKT.URIS, C = HKT.Auto> {
  <A>(S: Semigroup<A>): <N extends string, K, Q, W, X, I, S, R, E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1>(
    fa1: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    fa2: HKT.Kind<
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
    A
  >
}

export interface AlignCombineFn<F extends HKT.URIS, C = HKT.Auto> {
  <A>(S: Semigroup<A>): <N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1>(
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A>
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
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
    A
  >
}

export interface PadZipFn_<F extends HKT.URIS, C = HKT.Auto> {
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
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    HKT.Mix<C, 'E', [E, E1]>,
    readonly [Option<A>, Option<B>]
  >
}

export interface PadZipFn<F extends HKT.URIS, C = HKT.Auto> {
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
    readonly [Option<A>, Option<B>]
  >
}

export interface PadZipWithFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
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
    >,
    f: (_: readonly [Option<A>, Option<B>]) => C
  ): HKT.Kind<
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
    C
  >
}

export interface PadZipWithFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B, C>(
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    f: (_: readonly [Option<A>, Option<B>]) => C
  ): <N extends string, K, Q, W, X, I, S, R, E, A>(
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
    C
  >
}

export interface ZipAllFn_<F extends HKT.URIS, C = HKT.Auto> {
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
    >,
    a: A,
    b: B
  ): HKT.Kind<
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
    readonly [A, B]
  >
}

export interface ZipAllFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, B>(
    fb: HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, B>,
    a: A,
    b: B
  ): <N extends string, K, Q, W, X, I, S, R, E, A>(
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
    readonly [A, B]
  >
}
