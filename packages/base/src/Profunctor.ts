import type { Functor } from './Functor'
import type * as HKT from './HKT'

export interface Profunctor<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly dimap_: DimapFn_<F, C>
  readonly dimap: DimapFn<F, C>
}

export interface DimapFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, A, B, C, D>(
    pbc: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, B, C>,
    f: (a: A) => B,
    g: (c: C) => D
  ): HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, A, D>
}

export interface DimapFn<F extends HKT.URIS, TC = HKT.Auto> {
  <A, B, C, D>(f: (a: A) => B, g: (c: C) => D): <N extends string, K, Q, W, X, I, S, R>(
    pbc: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, B, C>
  ) => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, A, D>
}
