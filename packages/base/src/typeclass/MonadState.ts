import type * as HKT from '../HKT'
import type { Monad } from './Monad'

export interface MonadState<F extends HKT.URIS, TC = HKT.Auto> extends Monad<F, TC> {
  readonly get: GetFn<F, TC>
  readonly put: PutFn<F, TC>
  readonly modify: ModifyFn<F, TC>
  readonly gets: GetsFn<F, TC>
}

export interface GetFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, S>
}

export interface PutFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    s: S
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, void>
}

export interface GetsFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    A,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    f: (s: S) => A
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
}

export interface ModifyFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    S,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    f: (s: S) => S
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, void>
}
