import type { Apply, ApplyComposition } from './Apply'
import type { Functor } from './Functor'
import type { Unit, UnitComposition } from './Unit'

import { getApplyComposition } from './Apply'
import { constant } from './Function'
import * as HKT from './HKT'

export interface Applicative<F extends HKT.URIS, TC = HKT.Auto> extends Apply<F, TC>, Unit<F, TC> {
  readonly pure: PureFn<F, TC>
}

export interface ApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>
  extends ApplyComposition<F, G, TCF, TCG>,
    UnitComposition<F, G, TCF, TCG> {
  readonly pure: PureFnComposition<F, G, TCF, TCG>
}

export function getApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>(
  F: Applicative<F, TCF>,
  G: Applicative<G, TCG>
): ApplicativeComposition<F, G, TCF, TCG>
export function getApplicativeComposition<F, G>(F: Applicative<HKT.UHKT<F>>, G: Applicative<HKT.UHKT<G>>) {
  return HKT.instance<ApplicativeComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getApplyComposition(F, G),
    unit: () => F.map_(F.unit(), G.unit),
    pure: (a) => F.pure(G.pure(a))
  })
}

export interface PureFn<F extends HKT.URIS, C = HKT.Auto> {
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
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
}

export interface PureFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<CF, 'N'>,
    K = HKT.Initial<CF, 'K'>,
    Q = HKT.Initial<CF, 'Q'>,
    W = HKT.Initial<CF, 'W'>,
    X = HKT.Initial<CF, 'X'>,
    I = HKT.Initial<CF, 'I'>,
    S = HKT.Initial<CF, 'S'>,
    R = HKT.Initial<CF, 'R'>,
    E = HKT.Initial<CF, 'E'>
  >(
    a: A
  ): HKT.Kind<
    F,
    CF,
    N,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    HKT.Kind<
      G,
      CG,
      HKT.Initial<CG, 'N'>,
      HKT.Initial<CG, 'K'>,
      HKT.Initial<CG, 'Q'>,
      HKT.Initial<CG, 'W'>,
      HKT.Initial<CG, 'X'>,
      HKT.Initial<CG, 'I'>,
      HKT.Initial<CG, 'S'>,
      HKT.Initial<CG, 'R'>,
      HKT.Initial<CG, 'E'>,
      A
    >
  >
}

export function pureF<F extends HKT.URIS, TC = HKT.Auto>(F: Functor<F, TC> & Unit<F, TC>): PureFn<F, TC>
export function pureF<F>(F: Functor<HKT.UHKT<F>> & Unit<HKT.UHKT<F>>): PureFn<HKT.UHKT<F>> {
  return (a) => F.map_(F.unit(), constant(a))
}
