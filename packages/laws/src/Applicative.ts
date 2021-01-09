import type * as HKT from '@principia/base/HKT'
import type { Applicative } from '@principia/base/typeclass'

import * as Eq from '@principia/base/Eq'
import { compose_, tuple, tupleFlip, tupleUnit } from '@principia/base/Equivalence'
import * as fc from 'fast-check'

function AssociativityLaw<F extends HKT.URIS, TC, A, B, C>(
  F: Applicative<F, TC>,
  S: Eq.Eq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'N'>,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      readonly [readonly [A, B], C]
    >
  >
): <
  N extends string,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A,
  NB extends string,
  KB,
  QB,
  WB,
  XB,
  IB,
  SB,
  RB,
  EB,
  B,
  NC extends string,
  KC,
  QC,
  WC,
  XC,
  IC,
  SC,
  RC,
  EC,
  C
>(
  fs: [
    HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>,
    HKT.Kind<F, TC, NB, KB, QB, WB, XB, IB, SB, RB, EB, B>,
    HKT.Kind<F, TC, NC, KC, QC, WC, XC, IC, SC, RC, EC, C>
  ]
) => boolean
function AssociativityLaw<F, A, B, C>(
  F: Applicative<HKT.UHKT<F>>,
  S: Eq.Eq<HKT.HKT<F, readonly [readonly [A, B], C]>>
): (fs: [HKT.HKT<F, A>, HKT.HKT<F, B>, HKT.HKT<F, C>]) => boolean {
  const equiv = tuple<A, B, C>()
  return ([fa, fb, fc]) => {
    const left  = F.product_(fa, F.product_(fb, fc))
    const right = F.product_(F.product_(fa, fb), fc)
    const left2 = F.map_(left, equiv.to)
    return S.equals_(left2, right)
  }
}

function LeftIdentityLaw<F extends HKT.URIS, TC, A>(
  F: Applicative<F, TC>,
  S: Eq.Eq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'N'>,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      A
    >
  >
): <N extends string, K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>) => boolean
function LeftIdentityLaw<F, A>(F: Applicative<HKT.UHKT<F>>, S: Eq.Eq<HKT.HKT<F, A>>): (fa: HKT.HKT<F, A>) => boolean {
  const equiv = compose_(tupleFlip<void, A>(), tupleUnit())
  return (fa) => {
    const left  = F.product_(F.unit(), fa)
    const right = fa
    const left2 = F.map_(left, equiv.to)
    return S.equals_(left2, right)
  }
}

function RightIdentityLaw<F extends HKT.URIS, TC, A>(
  F: Applicative<F, TC>,
  S: Eq.Eq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'N'>,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      A
    >
  >
): <N extends string, K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>) => boolean
function RightIdentityLaw<F, A>(F: Applicative<HKT.UHKT<F>>, S: Eq.Eq<HKT.HKT<F, A>>): (fa: HKT.HKT<F, A>) => boolean {
  const equiv = tupleUnit<A>()
  return (fa) => {
    const left  = F.product_(fa, F.unit())
    const right = fa
    const left2 = F.map_(left, equiv.to)
    return S.equals_(left2, right)
  }
}

export const ApplicativeLaws = {
  associativity: AssociativityLaw,
  leftIdentity: LeftIdentityLaw,
  rightIdentity: RightIdentityLaw
}

export function testApplicativeAssociativity<F extends HKT.URIS, TC>(
  F: Applicative<F, TC>
): (
  lift: <A>(
    a: fc.Arbitrary<A>
  ) => fc.Arbitrary<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'N'>,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      A
    >
  >,
  liftEqs: <A, B, C>(
    Sa: Eq.Eq<A>,
    Sb: Eq.Eq<B>,
    Sc: Eq.Eq<C>
  ) => Eq.Eq<
    HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, 'N'>,
      HKT.Initial<TC, 'K'>,
      HKT.Initial<TC, 'Q'>,
      HKT.Initial<TC, 'W'>,
      HKT.Initial<TC, 'X'>,
      HKT.Initial<TC, 'I'>,
      HKT.Initial<TC, 'S'>,
      HKT.Initial<TC, 'R'>,
      HKT.Initial<TC, 'E'>,
      readonly [readonly [A, B], C]
    >
  >
) => void {
  return (lift, liftEqs) => {
    const arbString = lift(fc.string())
    const arbNumber = lift(fc.double())
    const Sabc      = liftEqs(Eq.string, Eq.number, Eq.number)

    const associativity = fc.property(fc.tuple(arbString, arbNumber, arbNumber), ApplicativeLaws.associativity(F, Sabc))

    fc.assert(associativity, {
      seed: -525356605,
      path: '26:2:2',
      endOnFailure: true,
      verbose: true
    })
  }
}
