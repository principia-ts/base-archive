import type { EitherURI } from './Modules'

import * as E from './Either'
import { flow, identity, pipe } from './Function'
import * as HKT from './HKT'
import * as O from './Option'
import * as P from './typeclass'

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.V<'E', '+'>

export function getEitherT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): EitherT<F, C>
export function getEitherT<F>(M: P.Monad<HKT.UHKT<F>>): EitherT<HKT.UHKT<F>> {
  const bind_: EitherT<HKT.UHKT<F>>['bind_'] = <E, A, E1, B>(
    ma: HKT.HKT<F, E.Either<E, A>>,
    f: (a: A) => HKT.HKT<F, E.Either<E1, B>>
  ) => M.bind_(ma, E.fold(flow(E.left, E.widenE<E1>(), M.pure), flow(f, M.map(E.widenE<E>()))))

  const catchAll_: EitherT<HKT.UHKT<F>>['catchAll_'] = <E, A, E1, A1>(
    fa: HKT.HKT<F, E.Either<E, A>>,
    f: (e: E) => HKT.HKT<F, E.Either<E1, A1>>
  ): HKT.HKT<F, E.Either<E1, A | A1>> =>
    M.bind_(
      fa,
      E.fold(
        (e): HKT.HKT<F, E.Either<E1, A | A1>> => f(e),
        (a) => M.pure(E.right(a))
      )
    )

  const catchSome_: EitherT<HKT.UHKT<F>>['catchSome_'] = <E, A, E1, A1>(
    fa: HKT.HKT<F, E.Either<E, A>>,
    f: (e: E) => O.Option<HKT.HKT<F, E.Either<E1, A1>>>
  ) =>
    catchAll_(
      fa,
      flow(
        f,
        O.getOrElse((): HKT.HKT<F, E.Either<E | E1, A | A1>> => fa)
      )
    )

  return HKT.instance<EitherT<HKT.UHKT<F>>>({
    ...P.getApplicativeComposition(M, E.Applicative),
    bind_: bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten: <E, A, D>(mma: HKT.HKT<F, E.Either<E, HKT.HKT<F, E.Either<D, A>>>>) =>
      pipe(mma, M.map(E.fold((e) => M.pure(E.widenE<D>()(E.left(e))), M.map(E.widenE<E>()))), M.flatten),
    unit: () => M.pure(E.unit()),
    fail: flow(E.left, M.pure),
    catchAll_: catchAll_,
    catchAll: (f) => (fa) => catchAll_(fa, f),
    catchSome_,
    catchSome: (f) => (fa) => catchSome_(fa, f),
    absolve: <E, E1, A>(fa: HKT.HKT<F, E.Either<E, E.Either<E1, A>>>) => M.map_(fa, E.fold(E.left, identity)),
    attempt: (fa) => M.map_(fa, E.fold(flow(E.left, E.right), flow(E.right, E.right)))
  })
}

export interface EitherT<M extends HKT.URIS, C = HKT.Auto>
  extends P.MonadExcept<[M[0], ...HKT.Rest<M>, HKT.URI<EitherURI>], V<C>> {}
