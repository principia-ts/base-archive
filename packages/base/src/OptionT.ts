import type { OptionURI } from './Modules'

import { getApplicativeComposition } from './Applicative'
import { getApplyComposition } from './Apply'
import { flow, identity } from './Function'
import { getFunctorComposition } from './Functor'
import * as HKT from './HKT'
import * as O from './Option'
import * as P from './typeclass'

export interface SomeFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(
    a: A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>
}

export function some<F extends HKT.URIS, C = HKT.Auto>(F: P.Applicative<F, C>): SomeFn<F, C> {
  return flow(O.Some, F.pure)
}

export interface NoneFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A = never,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>
}

export function none<F extends HKT.URIS, C = HKT.Auto>(F: P.Applicative<F, C>): NoneFn<F, C> {
  return () => F.pure(O.None())
}

export interface FromFFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
    F,
    C,
    N,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    O.Option<A>
  >
}

export function fromF<F extends HKT.URIS, C = HKT.Auto>(F: P.Applicative<F, C>): FromFFn<F, C> {
  return F.map(O.Some)
}

export interface GetOrElseFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>,
    onNone: () => HKT.Kind<
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
      A1
    >
  ): HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'Q', [W, W1]>,
    HKT.Mix<C, 'Q', [X, X1]>,
    HKT.Mix<C, 'Q', [I, I1]>,
    HKT.Mix<C, 'Q', [S, S1]>,
    HKT.Mix<C, 'Q', [R, R1]>,
    HKT.Mix<C, 'Q', [E, E1]>,
    A | A1
  >
}

export function getOrElse_<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): GetOrElseFn_<F, C> {
  return (fa, onNone) => M.bind_(fa, O.match(onNone, M.pure))
}

export interface GetOrElseFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(onNone: () => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): <
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1
  >(
    fa: HKT.Kind<
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
      O.Option<A>
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, 'N', [N, N1]>,
    HKT.Mix<C, 'K', [K, K1]>,
    HKT.Mix<C, 'Q', [Q, Q1]>,
    HKT.Mix<C, 'Q', [W, W1]>,
    HKT.Mix<C, 'Q', [X, X1]>,
    HKT.Mix<C, 'Q', [I, I1]>,
    HKT.Mix<C, 'Q', [S, S1]>,
    HKT.Mix<C, 'Q', [R, R1]>,
    HKT.Mix<C, 'Q', [E, E1]>,
    A | A1
  >
}

export function getOrElse<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): GetOrElseFn<F, C> {
  return (onNone) => M.bind(O.match(onNone, M.pure))
}

export function Functor<F extends HKT.URIS, C = HKT.Auto>(
  F: P.Functor<F, C>
): P.Functor<[F[0], ...HKT.Rest<F>, HKT.URI<OptionURI>], C> {
  return HKT.instance({ ...getFunctorComposition(F, O.Functor) })
}

export function Apply<F extends HKT.URIS, C = HKT.Auto>(
  A: P.Apply<F, C>
): P.Apply<[F[0], ...HKT.Rest<F>, HKT.URI<OptionURI>], C> {
  return HKT.instance({ ...getApplyComposition(A, O.Apply) })
}

export function Applicative<F extends HKT.URIS, C = HKT.Auto>(
  A: P.Applicative<F, C>
): P.Applicative<[F[0], ...HKT.Rest<F>, HKT.URI<OptionURI>], C> {
  return HKT.instance({ ...getApplicativeComposition(A, O.Applicative) })
}

export function getOptionT<M extends HKT.URIS, C = HKT.Auto>(M: P.Monad<M, C>): OptionT<M, C>
export function getOptionT<M>(M: P.Monad<HKT.UHKT<M>, HKT.Auto>): OptionT<HKT.UHKT<M>> {
  const bind_: OptionT<HKT.UHKT<M>>['bind_'] = (ma, f) =>
    M.bind_(
      ma,
      O.match(() => M.pure(O.None()), f)
    )

  return HKT.instance<OptionT<HKT.UHKT<M>>>({
    ...P.getApplicativeComposition(M, O.Applicative),
    bind_: bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten: (mma) => bind_(mma, identity),
    none: () => M.pure(O.None()),
    some: (a) => M.pure(O.Some(a)),
    someM: (ma) => M.map_(ma, O.Some),
    foldOption_: (ma, onNone, onSome) => M.map_(ma, O.match(onNone, onSome)),
    foldOption: (onNone, onSome) => M.map(O.match(onNone, onSome)),
    foldOptionM_: <A1, A2, A3>(
      ma: HKT.HKT<M, O.Option<A1>>,
      onNone: () => HKT.HKT<M, A2>,
      onSome: (a: A1) => HKT.HKT<M, A3>
    ) =>
      M.bind_(
        ma,
        O.match((): HKT.HKT<M, A2 | A3> => onNone(), onSome)
      ),
    foldOptionM: <A1, A2, A3>(onNone: () => HKT.HKT<M, A2>, onSome: (a: A1) => HKT.HKT<M, A3>) => (
      ma: HKT.HKT<M, O.Option<A1>>
    ) =>
      M.bind_(
        ma,
        O.match((): HKT.HKT<M, A2 | A3> => onNone(), onSome)
      )
  })
}

export interface OptionT<M extends HKT.URIS, C = HKT.Auto>
  extends P.Monad<[M[0], ...HKT.Rest<M>, HKT.URI<OptionURI>], C> {
  readonly some: <
    A,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(
    a: A
  ) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>

  readonly none: <
    A = never,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >() => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>

  readonly someM: <N extends string, K, Q, W, X, I, S, R, E, A>(
    ma: HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>

  readonly foldOption_: <N extends string, K, Q, W, X, I, S, R, E, A, B, C>(
    ma: HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>,
    onNone: () => B,
    onSome: (a: A) => C
  ) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, B | C>

  readonly foldOption: <A, B, C>(
    onNone: () => B,
    onSome: (a: A) => C
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
    ma: HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, O.Option<A>>
  ) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, B | C>

  readonly foldOptionM_: <
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1,
    N2 extends string,
    K2,
    Q2,
    W2,
    X2,
    I2,
    S2,
    R2,
    E2,
    A2,
    N3 extends string,
    K3,
    Q3,
    W3,
    X3,
    I3,
    S3,
    R3,
    E3,
    A3
  >(
    ma: HKT.Kind<M, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, O.Option<A1>>,
    onNone: () => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'N', N1, N2>,
      HKT.Intro<C, 'K', K1, K2>,
      HKT.Intro<C, 'Q', Q1, Q2>,
      HKT.Intro<C, 'W', W1, W2>,
      HKT.Intro<C, 'X', X1, X2>,
      HKT.Intro<C, 'I', I1, I2>,
      HKT.Intro<C, 'S', S1, S2>,
      HKT.Intro<C, 'R', R1, R2>,
      HKT.Intro<C, 'E', E1, E2>,
      A2
    >,
    onSome: (
      a: A1
    ) => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'N', N2, N3>,
      HKT.Intro<C, 'K', K2, K3>,
      HKT.Intro<C, 'Q', Q2, Q3>,
      HKT.Intro<C, 'W', W2, W3>,
      HKT.Intro<C, 'X', X2, X3>,
      HKT.Intro<C, 'I', I2, I3>,
      HKT.Intro<C, 'S', S2, S3>,
      HKT.Intro<C, 'R', R2, R3>,
      HKT.Intro<C, 'E', E2, E3>,
      A3
    >
  ) => HKT.Kind<
    M,
    C,
    HKT.Mix<C, 'N', [N1, N2, N3]>,
    HKT.Mix<C, 'K', [K1, K2, K3]>,
    HKT.Mix<C, 'Q', [Q1, Q2, Q3]>,
    HKT.Mix<C, 'Q', [W1, W2, W3]>,
    HKT.Mix<C, 'Q', [X1, X2, X3]>,
    HKT.Mix<C, 'Q', [I1, I2, I3]>,
    HKT.Mix<C, 'Q', [S1, S2, S3]>,
    HKT.Mix<C, 'Q', [R1, R2, R3]>,
    HKT.Mix<C, 'Q', [E1, E2, E3]>,
    A2 | A3
  >

  readonly foldOptionM: <
    N1 extends string,
    K1,
    Q1,
    W1,
    X1,
    I1,
    S1,
    R1,
    E1,
    A1,
    N2 extends string,
    K2,
    Q2,
    W2,
    X2,
    I2,
    S2,
    R2,
    E2,
    A2,
    N3 extends string,
    K3,
    Q3,
    W3,
    X3,
    I3,
    S3,
    R3,
    E3,
    A3
  >(
    onNone: () => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'N', N1, N2>,
      HKT.Intro<C, 'K', K1, K2>,
      HKT.Intro<C, 'Q', Q1, Q2>,
      HKT.Intro<C, 'W', W1, W2>,
      HKT.Intro<C, 'X', X1, X2>,
      HKT.Intro<C, 'I', I1, I2>,
      HKT.Intro<C, 'S', S1, S2>,
      HKT.Intro<C, 'R', R1, R2>,
      HKT.Intro<C, 'E', E1, E2>,
      A2
    >,
    onSome: (
      a: A1
    ) => HKT.Kind<
      M,
      C,
      HKT.Intro<C, 'N', N2, N3>,
      HKT.Intro<C, 'K', K2, K3>,
      HKT.Intro<C, 'Q', Q2, Q3>,
      HKT.Intro<C, 'W', W2, W3>,
      HKT.Intro<C, 'X', X2, X3>,
      HKT.Intro<C, 'I', I2, I3>,
      HKT.Intro<C, 'S', S2, S3>,
      HKT.Intro<C, 'R', R2, R3>,
      HKT.Intro<C, 'E', E2, E3>,
      A3
    >
  ) => (
    ma: HKT.Kind<M, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, O.Option<A1>>
  ) => HKT.Kind<
    M,
    C,
    HKT.Mix<C, 'N', [N1, N2, N3]>,
    HKT.Mix<C, 'K', [K1, K2, K3]>,
    HKT.Mix<C, 'Q', [Q1, Q2, Q3]>,
    HKT.Mix<C, 'Q', [W1, W2, W3]>,
    HKT.Mix<C, 'Q', [X1, X2, X3]>,
    HKT.Mix<C, 'Q', [I1, I2, I3]>,
    HKT.Mix<C, 'Q', [S1, S2, S3]>,
    HKT.Mix<C, 'Q', [R1, R2, R3]>,
    HKT.Mix<C, 'Q', [E1, E2, E3]>,
    A2 | A3
  >
}
