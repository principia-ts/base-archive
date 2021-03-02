import type { MReaderURI } from './Modules'
import type * as P from '@principia/base/typeclass'

import { flow, pipe } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import * as Mu from '@principia/io/Multi'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export interface MReaderT<F extends HKT.URIS, C = HKT.Auto> extends P.MonadEnv<[HKT.URI<MReaderURI>, ...F], V<C>> {}

export function getMReaderT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): MReaderT<F, C>
export function getMReaderT<F>(M: P.Monad<HKT.UHKT<F>>): MReaderT<HKT.UHKT<F>> {
  const map_: MReaderT<HKT.UHKT<F>>['map_'] = (fa, f) => Mu.map_(fa, M.map(f))

  const crossWith_: MReaderT<HKT.UHKT<F>>['crossWith_'] = (rfa, rfb, f) =>
    Mu.bind_(rfa, (fa) => Mu.map_(rfb, (fb) => M.crossWith_(fa, fb, f)))

  const bind_: MReaderT<HKT.UHKT<F>>['bind_'] = (rma, f) =>
    Mu.asks((r) => pipe(rma, Mu.giveAll(r), Mu.runResult, M.bind(flow(f, Mu.runEnv(r)))))
  return HKT.instance<MReaderT<HKT.UHKT<F>>>({
    map_,
    map: (f) => (fa) => map_(fa, f),
    crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
    bind_,
    bind: (f) => (ma) => bind_(ma, f),
    giveAll_: Mu.giveAll_,
    giveAll: Mu.giveAll,
    asks: (f) => Mu.asks(flow(f, M.pure)),
    pure: flow(M.pure, Mu.pure)
  })
}
