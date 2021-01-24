import type { Functor } from './Functor'
import type * as HKT from './HKT'

export interface Comonad<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly extract: ExtractFn<F, C>
  readonly extend_: ExtendFn_<F, C>
  readonly extend: ExtendFn<F, C>
  readonly duplicate: DuplicateFn<F, C>
}

export interface ExtractFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): A
}

export interface ExtendFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(f: (wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B): (
    wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface ExtendFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}

export interface DuplicateFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A>(wa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>): HKT.Kind<
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
    HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  >
}
