import * as HKT from '../HKT'
import * as P from '../typeclass'
import * as E from './Either'
import { flow, identity, pipe } from './Function'

export type V<C> = HKT.CleanParam<C, 'E'> & HKT.V<'E', '+'>

export type EitherTURI<F extends HKT.URIS> = HKT.AppendURI<F, E.URI>

export function getEitherT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): P.Monad<EitherTURI<F>, V<C>>
export function getEitherT<F>(M: P.Monad<HKT.UHKT<F>>): P.Monad<EitherTURI<HKT.UHKT<F>>, E.V> {
  const flatMap_: P.FlatMapFn_<EitherTURI<HKT.UHKT<F>>, E.V> = <E, A, E1, B>(
    ma: HKT.HKT<F, E.Either<E, A>>,
    f: (a: A) => HKT.HKT<F, E.Either<E1, B>>
  ) => M.flatMap_(ma, E.fold(flow(E.left, E.widenE<E1>(), M.pure), flow(f, M.map(E.widenE<E>()))))

  return HKT.instance<EitherT<HKT.UHKT<F>>>({
    ...P.getApplicativeComposition(M, E.Applicative),
    flatMap_,
    flatMap: (f) => (ma) => flatMap_(ma, f),
    flatten: <E, A, D>(mma: HKT.HKT<F, E.Either<E, HKT.HKT<F, E.Either<D, A>>>>) =>
      pipe(mma, M.map(E.fold((e) => M.pure(E.widenE<D>()(E.left(e))), M.map(E.widenE<E>()))), M.flatten),
    unit: () => M.pure(E.unit()),
    absolve: <E, E1, A>(fa: HKT.HKT<F, E.Either<E, E.Either<E1, A>>>) => M.map_(fa, E.fold(E.left, identity)),
    recover: (fa) => M.map_(fa, E.fold(flow(E.left, E.right), flow(E.right, E.right))),
    fail: flow(E.left, M.pure)
  })
}

export interface EitherT<M extends HKT.URIS, C = HKT.Auto>
  extends P.Monad<EitherTURI<M>, V<C>>,
    P.Fallible<EitherTURI<M>, V<C>> {}
