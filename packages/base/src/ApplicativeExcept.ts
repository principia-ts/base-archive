import type { Applicative, ApplicativeMin } from './Applicative'
import type { Either } from './Either'
import type { Fail, FailMin } from './Fail'
import type { Option } from './Option'

import { getApplicative } from './Applicative'
import * as HKT from './HKT'

export interface ApplicativeExcept<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, Fail<F, C> {
  readonly attempt: AttemptFn<F, C>
  readonly catchAll_: CatchAllFn_<F, C>
  readonly catchAll: CatchAllFn<F, C>
  readonly catchSome_: CatchSomeFn_<F, C>
  readonly catchSome: CatchSomeFn<F, C>
}

export type ApplicativeExceptMin<F extends HKT.URIS, C = HKT.Auto> = ApplicativeMin<F, C> &
  FailMin<F, C> & {
    readonly catchAll_: CatchAllFn_<F, C>
  }

export function getApplicativeExcept<F extends HKT.URIS, C = HKT.Auto>(
  F: ApplicativeExceptMin<F, C>
): ApplicativeExcept<F, C> {
  const catchSome_: ApplicativeExcept<F, C>['catchSome_'] = (fa, f) =>
    F.catchAll_(fa, (e) => {
      const res = f(e)
      switch (res._tag) {
        case 'Some':
          return res.value
        case 'None':
          return F.fail(e)
      }
    })
  return HKT.instance<ApplicativeExcept<F, C>>({
    ...getApplicative(F),
    fail: F.fail,
    catchAll_: F.catchAll_,
    catchAll: (f) => (fa) => F.catchAll_(fa, f),
    catchSome_,
    catchSome: (f) => (fa) => catchSome_(fa, f),
    attempt: (fa) =>
      F.catchAll_(
        F.map_(fa, (a) => ({ _tag: 'Right', right: a })),
        (e) => F.pure({ _tag: 'Left', left: e })
      )
  })
}

export interface CatchAllFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (
      e: HKT.OrFix<'E', C, E>
    ) => HKT.Kind<
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
    HKT.Mix<C, 'W', [W, W1]>,
    HKT.Mix<C, 'X', [X, X1]>,
    HKT.Mix<C, 'I', [I, I1]>,
    HKT.Mix<C, 'S', [S, S1]>,
    HKT.Mix<C, 'R', [R, R1]>,
    E1,
    A | A1
  >
}

export interface CatchAllFn<F extends HKT.URIS, C = HKT.Auto> {
  <E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    f: (e: HKT.OrFix<'E', C, E>) => HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
  ): <N extends string, K, Q, W, X, I, S, R, A>(
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
    E1,
    A | A1
  >
}

export interface CatchSomeFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (
      e: HKT.OrFix<'E', C, E>
    ) => Option<
      HKT.Kind<
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
    A | A1
  >
}

export interface CatchSomeFn<F extends HKT.URIS, C = HKT.Auto> {
  <E, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1>(
    f: (e: HKT.OrFix<'E', C, E>) => Option<HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>>
  ): <N extends string, K, Q, W, X, I, S, R, A>(
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
    A | A1
  >
}

export interface AttemptFn<F extends HKT.URIS, C = HKT.Auto> {
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
    never,
    Either<HKT.OrFix<'E', C, E>, A>
  >
}
