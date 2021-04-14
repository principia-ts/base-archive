import type * as HKT from '@principia/base/HKT'
import type { ZReaderURI } from '@principia/base/ZReader'

import { flow, pipe } from '@principia/base/function'
import * as P from '@principia/base/typeclass'
import * as Z from '@principia/base/Z'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export interface ZReaderT<F extends HKT.URIS, C = HKT.Auto> extends P.MonadEnv<[HKT.URI<ZReaderURI>, ...F], V<C>> {}

export function getZReaderT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): ZReaderT<F, C>
export function getZReaderT<F>(M: P.Monad<HKT.UHKT<F>>): ZReaderT<HKT.UHKT<F>> {
  const map_: ZReaderT<HKT.UHKT<F>>['map_'] = (fa, f) => Z.map_(fa, M.map(f))

  const crossWith_: ZReaderT<HKT.UHKT<F>>['crossWith_'] = (rfa, rfb, f) =>
    Z.bind_(rfa, (fa) => Z.map_(rfb, (fb) => M.crossWith_(fa, fb, f)))

  const bind_: ZReaderT<HKT.UHKT<F>>['bind_'] = (rma, f) =>
    Z.asks((r) => pipe(rma, Z.giveAll(r), Z.runResult, M.bind(flow(f, Z.runReader(r)))))
  return P.MonadEnv({
    map_,
    crossWith_,
    ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
    bind_,
    giveAll_: Z.giveAll_,
    asks: (f) => Z.asks(flow(f, M.pure)),
    unit: flow(M.unit, Z.pure),
    pure: flow(M.pure, Z.pure)
  })
}
