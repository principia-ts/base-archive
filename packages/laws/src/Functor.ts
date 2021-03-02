import type { MaybeAsyncEq } from './utils'
import type { MorphismN } from '@principia/base/Function'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/typeclass'

import * as Eq from '@principia/base/Eq'
import * as fc from 'fast-check'

import { isPromise } from './utils'

function CompositionLaw<F extends HKT.URIS, TC, N extends string, K, Q, W, X, I, S, R, E, A, B, C>(
  F: P.Functor<F, TC>,
  S: MaybeAsyncEq<HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, C>>,
  ab: MorphismN<[A], B>,
  bc: MorphismN<[B], C>
): (fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function CompositionLaw<F, A, B, C>(
  F: P.Functor<HKT.UHKT<F>>,
  S: MaybeAsyncEq<HKT.HKT<F, C>>,
  ab: MorphismN<[A], B>,
  bc: MorphismN<[B], C>
): (fa: HKT.HKT<F, A>) => Promise<boolean> {
  return (fa) => {
    const b = S.equals_(
      F.map_(fa, (a) => bc(ab(a))),
      F.map_(F.map_(fa, ab), bc)
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

function IdentityLaw<F extends HKT.URIS, TC, N extends string, K, Q, W, X, I, S, R, E, A>(
  F: P.Functor<F, TC>,
  S: MaybeAsyncEq<HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>>
): (fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function IdentityLaw<F, A>(
  F: P.Functor<HKT.UHKT<F>>,
  S: MaybeAsyncEq<HKT.HKT<F, A>>
): (fa: HKT.HKT<F, A>) => Promise<boolean> {
  return (fa) => {
    const b = S.equals_(
      F.map_(fa, (a) => a),
      fa
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

export const Functor = {
  identity: IdentityLaw,
  composition: CompositionLaw
}

export function testFunctorComposition<F extends HKT.URIS, C>(
  F: P.Functor<F, C>
): (
  lift: <A>(
    a: fc.Arbitrary<A>
  ) => fc.Arbitrary<
    HKT.Kind<
      F,
      C,
      HKT.Initial<C, 'N'>,
      HKT.Initial<C, 'K'>,
      HKT.Initial<C, 'Q'>,
      HKT.Initial<C, 'W'>,
      HKT.Initial<C, 'X'>,
      HKT.Initial<C, 'I'>,
      HKT.Initial<C, 'S'>,
      HKT.Initial<C, 'R'>,
      HKT.Initial<C, 'E'>,
      A
    >
  >,
  liftEq: <A>(
    Sa: Eq.Eq<A>
  ) => MaybeAsyncEq<
    HKT.Kind<
      F,
      C,
      HKT.Initial<C, 'N'>,
      HKT.Initial<C, 'K'>,
      HKT.Initial<C, 'Q'>,
      HKT.Initial<C, 'W'>,
      HKT.Initial<C, 'X'>,
      HKT.Initial<C, 'I'>,
      HKT.Initial<C, 'S'>,
      HKT.Initial<C, 'R'>,
      HKT.Initial<C, 'E'>,
      A
    >
  >
) => void {
  return (lift, liftEq) => {
    const arb = lift(fc.string())
    const Sa  = liftEq(Eq.string)
    const Sc  = liftEq(Eq.number)
    const ab  = (s: string): number | null | undefined => (s.length === 1 ? undefined : s.length === 2 ? null : s.length)
    const bc  = (n: number | null | undefined): number => (n === undefined ? 1 : n === null ? 2 : n * 2)

    const composition = fc.asyncProperty(arb, Functor.composition(F, Sc, ab, bc))
    const identity    = fc.asyncProperty(arb, Functor.identity(F, Sa))

    fc.assert(identity, { seed: -525356605, path: '26:2:2', endOnFailure: true, verbose: true })
    fc.assert(composition, { seed: -525356605, path: '26:2:2', endOnFailure: true, verbose: true })
  }
}
