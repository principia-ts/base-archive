import type { MorphismN } from '@principia/base/Function'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/typeclass'

import * as Eq from '@principia/base/Eq'
import * as fc from 'fast-check'

import { Bind } from './Bind'

function LeftIdentityLaw<M extends HKT.URIS, TC, A, N extends string, K, Q, W, X, I, S, R, E, B>(
  M: P.Monad<M, TC>,
  S: Eq.Eq<
    HKT.Kind<
      M,
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
      B
    >
  >,
  afb: (a: A) => HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, B>
): (a: A) => boolean
function LeftIdentityLaw<M, A, B>(
  M: P.Monad<HKT.UHKT<M>>,
  S: Eq.Eq<HKT.HKT<M, B>>,
  afb: MorphismN<[A], HKT.HKT<M, B>>
): (a: A) => boolean
function LeftIdentityLaw<M, A, B>(
  M: P.Monad<HKT.UHKT<M>>,
  S: Eq.Eq<HKT.HKT<M, B>>,
  afb: MorphismN<[A], HKT.HKT<M, B>>
): (a: A) => boolean {
  return (a) => {
    return S.equals_(
      M.flatten(
        M.map_(
          M.map_(M.unit(), () => a),
          afb
        )
      ),
      afb(a)
    )
  }
}

function RightIdentityLaw<M extends HKT.URIS, TC, N extends string, K, Q, W, X, I, S, R, E, A>(
  M: P.Monad<M, TC>,
  S: Eq.Eq<HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, A>>
): (a: HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, A>) => boolean
function RightIdentityLaw<M, A>(M: P.Monad<HKT.UHKT<M>>, S: Eq.Eq<HKT.HKT<M, A>>): (fa: HKT.HKT<M, A>) => boolean
function RightIdentityLaw<M, A>(M: P.Monad<HKT.UHKT<M>>, S: Eq.Eq<HKT.HKT<M, A>>): (fa: HKT.HKT<M, A>) => boolean {
  return (fa) => {
    return S.equals_(M.flatten(M.map_(fa, (a) => M.map_(M.unit(), () => a))), fa)
  }
}

export const Monad = {
  ...Bind,
  leftIdentity: LeftIdentityLaw,
  rightIdentity: RightIdentityLaw
}

export function testMonad<M extends HKT.URIS, C>(
  M: P.Monad<M, C>
): <
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
  liftEq: <A>(S: Eq.Eq<A>) => Eq.Eq<HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, A>>
) => void
export function testMonad<M>(M: P.Monad<HKT.UHKT<M>>): (liftEq: <A>(S: Eq.Eq<A>) => Eq.Eq<HKT.HKT<M, A>>) => void {
  return (liftEq) => {
    const Sa = liftEq(Eq.string)
    const Sb = liftEq(Eq.number)
    const Sc = liftEq(Eq.boolean)

    const arbFa = fc.string().map(M.pure)
    const afb   = (s: string) => M.pure(s.length)
    const afc   = (n: number) => M.pure(n > 2)

    const associativity = fc.property(arbFa, Monad.associativity(M, Sc, afb, afc))
    const leftId        = fc.property(fc.string(), Monad.leftIdentity(M, Sb, afb))
    const rightId       = fc.property(arbFa, Monad.rightIdentity(M, Sa))

    fc.assert(associativity, { verbose: true })
    fc.assert(leftId, { verbose: true })
    fc.assert(rightId, { verbose: true })
  }
}
