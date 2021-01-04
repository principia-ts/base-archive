import type * as P from '../typeclass'
import type * as R from './Reader'

import { identity, tuple } from '../data/Function'
import * as HKT from '../HKT'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export type ReaderTURI<M extends HKT.URIS> = HKT.PrependURI<R.URI, M>

export interface ReaderT<M extends HKT.URIS, C = HKT.Auto> extends P.Monad<ReaderTURI<M>, V<C>> {}

export function getMonadReaderT<M extends HKT.URIS, C = HKT.Auto>(M: P.Monad<M, C>): ReaderT<M, C>
export function getMonadReaderT<M>(M: P.Monad<HKT.UHKT<M>>): ReaderT<HKT.UHKT<M>> {
  const map_: P.MapFn_<ReaderTURI<HKT.UHKT<M>>, V<HKT.Auto>> = (fa, f) => (r) => M.map_(fa(r), f)

  const map2_: P.Map2Fn_<ReaderTURI<HKT.UHKT<M>>, V<HKT.Auto>> = (fa, fb, f) => (r) =>
    M.flatMap_(fa(r), (a) => M.map_(fb(r), (b) => f(a, b)))

  const flatMap_: P.FlatMapFn_<ReaderTURI<HKT.UHKT<M>>, V<HKT.Auto>> = (ma, f) => (r) =>
    M.flatMap_(ma(r), (a) => f(a)(r))

  return HKT.instance<ReaderT<HKT.UHKT<M>>>({
    imap_: (fa, f, _) => map_(fa, f),
    imap: (f, _) => (fa) => map_(fa, f),
    map_,
    map: (f) => (fa) => map_(fa, f),
    map2_,
    map2: (fb, f) => (fa) => map2_(fa, fb, f),
    product_: (fa, fb) => map2_(fa, fb, tuple),
    product: (fb) => (fa) => map2_(fa, fb, tuple),
    ap_: (fab, fa) => map2_(fab, fa, (f, a) => f(a)),
    ap: (fa) => (fab) => map2_(fab, fa, (f, a) => f(a)),
    unit: () => (_) => M.unit(),
    pure: (a) => (_) => M.pure(a),
    flatMap_,
    flatMap: (f) => (ma) => flatMap_(ma, f),
    flatten: (mma) => flatMap_(mma, identity)
  })
}
