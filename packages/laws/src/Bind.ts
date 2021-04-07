import type { MaybeAsyncEq } from './utils'
import type { FunctionN } from '@principia/base/function'
import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/typeclass'

import { isPromise } from './utils'

function AssociativeCompositionLaw<
  F extends HKT.URIS,
  TC,
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
  F: P.Bind<F, TC>,
  S: MaybeAsyncEq<
    HKT.Kind<
      F,
      TC,
      HKT.Mix<TC, 'N', [N, NB, NC]>,
      HKT.Mix<TC, 'K', [K, KB, KC]>,
      HKT.Mix<TC, 'Q', [Q, QB, QC]>,
      HKT.Mix<TC, 'W', [W, WB, WC]>,
      HKT.Mix<TC, 'X', [X, XB, XC]>,
      HKT.Mix<TC, 'I', [I, IB, IC]>,
      HKT.Mix<TC, 'S', [S, SB, SC]>,
      HKT.Mix<TC, 'R', [R, RB, RC]>,
      HKT.Mix<TC, 'E', [E, EB, EC]>,
      C
    >
  >,
  afb: (a: A) => HKT.Kind<F, TC, NB, KB, QB, WB, XB, IB, SB, RB, EB, B>,
  bfc: (b: B) => HKT.Kind<F, TC, NC, KC, QC, WC, XC, IC, SC, RC, EC, C>
): (fa: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>) => Promise<boolean>
function AssociativeCompositionLaw<F, A, B, C>(
  F: P.Bind<HKT.UHKT<F>>,
  S: MaybeAsyncEq<HKT.HKT<F, C>>,
  afb: FunctionN<[A], HKT.HKT<F, B>>,
  bfc: FunctionN<[B], HKT.HKT<F, C>>
): (fa: HKT.HKT<F, A>) => Promise<boolean>
function AssociativeCompositionLaw<F, A, B, C>(
  F: P.Bind<HKT.UHKT<F>>,
  S: MaybeAsyncEq<HKT.HKT<F, C>>,
  afb: FunctionN<[A], HKT.HKT<F, B>>,
  bfc: FunctionN<[B], HKT.HKT<F, C>>
): (fa: HKT.HKT<F, A>) => Promise<boolean> {
  return (fa) => {
    const b = S.equals_(
      F.bind_(F.bind_(fa, afb), bfc),
      F.bind_(fa, (a) => F.bind_(afb(a), bfc))
    )
    return isPromise(b) ? b : Promise.resolve(b)
  }
}

export const Bind = {
  associativity: AssociativeCompositionLaw
}
