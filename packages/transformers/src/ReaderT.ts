import type { Reader, ReaderURI } from '@principia/base/Reader'

import * as HKT from '@principia/base/HKT'
import * as P from '@principia/base/typeclass'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export interface ReaderT<M extends HKT.URIS, C = HKT.Auto> extends P.MonadEnv<[HKT.URI<ReaderURI>, ...M], V<C>> {}

export function getReaderT<M extends HKT.URIS, C = HKT.Auto>(M: P.Monad<M, C>): ReaderT<M, C>
export function getReaderT<M>(M: P.Monad<HKT.UHKT<M>>): ReaderT<HKT.UHKT<M>> {
  const map_: ReaderT<HKT.UHKT<M>>['map_'] = (fa, f) => (r) => M.map_(fa(r), f)

  const crossWith_: ReaderT<HKT.UHKT<M>>['crossWith_'] = (fa, fb, f) => (r) =>
    M.bind_(fa(r), (a) => M.map_(fb(r), (b) => f(a, b)))

  const bind_: ReaderT<HKT.UHKT<M>>['bind_'] = (ma, f) => (r) => M.bind_(ma(r), (a) => f(a)(r))

  return HKT.instance<ReaderT<HKT.UHKT<M>>>({
    ...P.getMonadEnv({
      map_,
      crossWith_,
      bind_,
      giveAll_: <R, A>(fa: Reader<R, HKT.HKT<M, A>>, r: R) => (_) => fa(r),
      asks: <R, A>(f: (_: R) => A) => (r: R) => M.pure(f(r)),
      pure: <R, A>(a: A) => () => M.pure(a)
    })
  })
}
