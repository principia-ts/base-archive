import type { EitherURI } from '@principia/base/Either'
import type * as P from '@principia/base/typeclass'

import * as E from '@principia/base/Either'
import { flow, identity } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import { getMonoidalComposition } from '@principia/base/typeclass'

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.V<'E', '+'>

export function getEitherT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): EitherT<F, C>
export function getEitherT<F>(M: P.Monad<HKT.UHKT<F>>): EitherT<HKT.UHKT<F>> {
  const bind_: EitherT<HKT.UHKT<F>>['bind_'] = <E, A, E1, B>(
    ma: HKT.HKT<F, E.Either<E, A>>,
    f: (a: A) => HKT.HKT<F, E.Either<E1, B>>
  ) =>
    M.bind_(
      ma,
      E.match(
        flow(E.Left, E.widenE<E1>(), M.pure),
        flow(f, (feb) => M.map_(feb, E.widenE<E>()))
      )
    )

  const catchAll_: EitherT<HKT.UHKT<F>>['catchAll_'] = <E, A, E1, A1>(
    fa: HKT.HKT<F, E.Either<E, A>>,
    f: (e: E) => HKT.HKT<F, E.Either<E1, A1>>
  ): HKT.HKT<F, E.Either<E1, A | A1>> =>
    M.bind_(
      fa,
      E.match(
        (e): HKT.HKT<F, E.Either<E1, A | A1>> => f(e),
        (a) => M.pure(E.Right(a))
      )
    )

  return HKT.instance<EitherT<HKT.UHKT<F>>>({
    ...getMonoidalComposition(M, E.Monoidal),
    fail: flow(E.Left, M.pure),
    bind_,
    bind: (f) => (ma) => bind_(ma, f),
    catchAll_,
    catchAll: (f) => (fa) => catchAll_(fa, f)
  })
}

export interface EitherT<M extends HKT.URIS, C = HKT.Auto>
  extends P.MonadExcept<[M[0], ...HKT.Rest<M>, HKT.URI<EitherURI>], V<C>> {}
