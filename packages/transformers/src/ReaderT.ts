import type { ReaderURI } from '@principia/base/Reader'

import * as HKT from '@principia/base/HKT'
import * as R from '@principia/base/Reader'
import * as P from '@principia/base/typeclass'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export interface ReaderT<M extends HKT.URIS, C = HKT.Auto> extends P.MonadEnv<[HKT.URI<ReaderURI>, ...M], V<C>> {}

export function getReaderT<M extends HKT.URIS, C = HKT.Auto>(M: P.Monad<M, C>): ReaderT<M, C>
export function getReaderT<M>(M: P.Monad<HKT.UHKT<M>>): ReaderT<HKT.UHKT<M>> {
  const bind_: ReaderT<HKT.UHKT<M>>['bind_'] = (ma, f) => (r) => M.bind_(ma(r), (a) => f(a)(r))

  return HKT.instance<ReaderT<HKT.UHKT<M>>>({
    ...P.getMonoidalComposition(R.MonadEnv, M),
    bind_,
    bind: (f) => (ma) => bind_(ma, f),
    giveAll_: R.giveAll_,
    giveAll: R.giveAll,
    asks: <R, A>(f: (_: R) => A) => (r: R) => M.pure(f(r)),
    pure: <A>(a: A) => () => M.pure(a)
  })
}
