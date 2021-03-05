import type { FunctorMin } from './Functor'

import { identity } from './Function'
import { Functor } from './Functor'
import * as HKT from './HKT'

export interface Bifunctor<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly bimap_: BimapFn_<F, C>
  readonly bimap: BimapFn<F, C>
  readonly mapLeft_: MapLeftFn_<F, C>
  readonly mapLeft: MapLeftFn<F, C>
}

export type BifunctorMin<F extends HKT.URIS, C = HKT.Auto> = (
  | { readonly mapLeft_: MapLeftFn_<F, C> }
  | { readonly bimap_: BimapFn_<F, C> }
  | { readonly mapLeft_: MapLeftFn_<F, C>, readonly bimap_: BimapFn_<F, C> }
) &
  FunctorMin<F, C>

export function Bifunctor<F extends HKT.URIS, C = HKT.Auto>(F: BifunctorMin<F, C>): Bifunctor<F, C> {
  let mapLeft_: MapLeftFn_<F, C>
  let bimap_: BimapFn_<F, C>

  if ('mapLeft_' in F && 'bimap_' in F) {
    mapLeft_ = F.mapLeft_
    bimap_   = F.bimap_
  }
  if ('mapLeft_' in F) {
    mapLeft_ = F.mapLeft_
    bimap_   = (fea, f, g) => F.map_(F.mapLeft_(fea, f), g)
  } else {
    mapLeft_ = (fea, f) => F.bimap_(fea, f, identity)
    bimap_   = F.bimap_
  }

  return HKT.instance<Bifunctor<F, C>>({
    ...Functor(F),
    mapLeft_,
    mapLeft: (f) => (fea) => mapLeft_(fea, f),
    bimap_,
    bimap: (f, g) => (fea) => bimap_(fea, f, g)
  })
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
