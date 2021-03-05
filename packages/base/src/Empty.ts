import type * as HKT from './HKT'

export interface Empty<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
  readonly empty: EmptyFn<F, TC>
}

export type EmptyMin<F extends HKT.URIS, C = HKT.Auto> = {
  readonly empty: EmptyFn<F, C>
}

export interface EmptyFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, never>
}
