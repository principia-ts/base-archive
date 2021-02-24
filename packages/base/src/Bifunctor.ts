import type { Functor } from './Functor'

import { flow, identity, pipe } from './Function'
import * as HKT from './HKT'

export interface Bifunctor<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly bimap_: BimapFn_<F, C>
  readonly bimap: BimapFn<F, C>
  readonly mapLeft_: MapLeftFn_<F, C>
  readonly mapLeft: MapLeftFn<F, C>
}

export type BifunctorMin<F extends HKT.URIS, C = HKT.Auto> = (
  | { readonly mapLeft_: MapLeftFn_<F, C>, readonly mapLeft: MapLeftFn<F, C> }
  | { readonly bimap_: BimapFn_<F, C>, readonly bimap: BimapFn<F, C> }
) &
  Functor<F, C>

export function getBifunctor<F extends HKT.URIS, C = HKT.Auto>(F: BifunctorMin<F, C>): Bifunctor<F, C> {
  if ('mapLeft_' in F) {
    return HKT.instance<Bifunctor<F, C>>({
      ...F,
      bimap_: (fea, f, g) => pipe(fea, F.mapLeft(f), F.map(g)),
      bimap: (f, g) => flow(F.mapLeft(f), F.map(g))
    })
  } else {
    return HKT.instance<Bifunctor<F, C>>({
      ...F,
      mapLeft_: (fea, f) => F.bimap_(fea, f, identity),
      mapLeft: (f) => F.bimap(f, identity)
    })
  }
}

export interface BimapFn<F extends HKT.URIS, C = HKT.Auto> {
  <E, A, H, B>(f: (e: E) => H, g: (a: A) => B): <N extends string, K, Q, W, X, I, S, R>(
    fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, B>
}

export interface BimapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, H, B>(
    fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (e: E) => H,
    g: (a: A) => B
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, B>
}

export interface MapLeftFn<F extends HKT.URIS, C = HKT.Auto> {
  <E, H>(f: (e: E) => H): <N extends string, K, Q, W, X, I, S, R, A>(
    fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, A>
}

export interface MapLeftFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, H>(
    fea: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (e: E) => H
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, H, A>
}
