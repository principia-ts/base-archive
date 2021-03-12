import type { BindToSFn } from './Functor'
import type { Monad } from './Monad'

import { _bind, _bindTo, flow, pipe } from './Function'
import * as HKT from './HKT'

export interface Do<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
  readonly bindS: BindSFn<F, C>
  readonly letS: LetSFn<F, C>
  readonly bindToS: BindToSFn<F, C>
}

export function deriveDo<F extends HKT.URIS, C = HKT.Auto>(M: Monad<F, C>): Do<F, C>
export function deriveDo<F>(M: Monad<HKT.UHKT<F>>): Do<HKT.UHKT<F>> {
  const bindS: BindSFn<HKT.UHKT<F>> = (name, f) =>
    flow(
      M.bind((a) =>
        pipe(
          f(a),
          M.map((b) => _bind(a, name, b))
        )
      )
    )
  return HKT.instance<Do<HKT.UHKT<F>>>({
    ...M,
    bindS,
    letS: (name, f) => bindS(name, flow(f, M.pure)),
    bindToS: (name) => (ma) => M.map_(ma, _bindTo(name))
  })
}

export interface BindSFn<F extends HKT.URIS, C = HKT.Auto> {
  <BN extends string, N1 extends string, K1, Q1, W1, X1, I1, S1, R1, E1, A1, A>(
    name: Exclude<BN, keyof A>,
    f: (a: A) => HKT.Kind<F, C, N1, K1, Q1, W1, X1, I1, S1, R1, E1, A1>
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
    HKT.Mix<C, 'N', [N1, N]>,
    HKT.Mix<C, 'K', [K1, K]>,
    HKT.Mix<C, 'Q', [Q1, Q]>,
    HKT.Mix<C, 'W', [W1, W]>,
    HKT.Mix<C, 'X', [X1, X]>,
    HKT.Mix<C, 'I', [I1, I]>,
    HKT.Mix<C, 'S', [S1, S]>,
    HKT.Mix<C, 'R', [R1, R]>,
    HKT.Mix<C, 'E', [E1, E]>,
    { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }
  >
}

export function bindSF<F extends HKT.URIS, C = HKT.Auto>(F: Monad<F, C>): BindSFn<F, C> {
  return (name, f) =>
    F.bind((a) =>
      pipe(
        f(a),
        F.map((b) => _bind(a, name, b))
      )
    )
}

export interface LetSFn<F extends HKT.URIS, C = HKT.Auto> {
  <BN extends string, A1, A>(name: Exclude<BN, keyof A>, f: (a: A) => A1): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, { [K in keyof A | BN]: K extends keyof A ? A[K] : A1 }>
}

export function letSF<F extends HKT.URIS, C = HKT.Auto>(F: Monad<F, C>): LetSFn<F, C> {
  return (name, f) =>
    F.bind((a) =>
      pipe(
        f(a),
        F.pure,
        F.map((b) => _bind(a, name, b))
      )
    )
}
