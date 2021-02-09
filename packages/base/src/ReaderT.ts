import type * as R from './Reader'
import type * as P from './typeclass'

import { identity, tuple } from './Function'
import * as HKT from './HKT'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export type ReaderTURI<M extends HKT.URIS> = HKT.PrependURI<R.URI, M>

export interface ReaderT<M extends HKT.URIS, C = HKT.Auto> extends P.Monad<ReaderTURI<M>, V<C>> {}

export function getMonadReaderT<M extends HKT.URIS, C = HKT.Auto>(M: P.Monad<M, C>): ReaderT<M, C>
export function getMonadReaderT<M>(M: P.Monad<HKT.UHKT<M>>): ReaderT<HKT.UHKT<M>> {
  const map_: P.MapFn_<ReaderTURI<HKT.UHKT<M>>, V<HKT.Auto>> = (fa, f) => (r) => M.map_(fa(r), f)

  const crossWith_: P.CrossWithFn_<ReaderTURI<HKT.UHKT<M>>, V<HKT.Auto>> = (fa, fb, f) => (r) =>
    M.bind_(fa(r), (a) => M.map_(fb(r), (b) => f(a, b)))

  const bind_: P.BindFn_<ReaderTURI<HKT.UHKT<M>>, V<HKT.Auto>> = (ma, f) => (r) => M.bind_(ma(r), (a) => f(a)(r))

  return HKT.instance<ReaderT<HKT.UHKT<M>>>({
    invmap_: (fa, f, _) => map_(fa, f),
    invmap: (f, _) => (fa) => map_(fa, f),
    map_,
    map: (f) => (fa) => map_(fa, f),
    crossWith_: crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
    cross_: (fa, fb) => crossWith_(fa, fb, tuple),
    cross: (fb) => (fa) => crossWith_(fa, fb, tuple),
    ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
    ap: (fa) => (fab) => crossWith_(fab, fa, (f, a) => f(a)),
    unit: () => (_) => M.unit(),
    pure: (a) => (_) => M.pure(a),
    bind_: bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten: (mma) => bind_(mma, identity)
  })
}
