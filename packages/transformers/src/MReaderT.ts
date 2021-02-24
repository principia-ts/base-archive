import type { MReaderURI } from './Modules'
import type * as HKT from '@principia/base/HKT'

import { flow, pipe } from '@principia/base/Function'
import * as P from '@principia/base/typeclass'
import * as Mu from '@principia/io/Multi'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export interface MReaderT<F extends HKT.URIS, C = HKT.Auto> extends P.MonadEnv<[HKT.URI<MReaderURI>, ...F], V<C>> {}

export function getMReaderT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): MReaderT<F, C>
export function getMReaderT<F>(M: P.Monad<HKT.UHKT<F>>): MReaderT<HKT.UHKT<F>> {
  return P.getMonadEnv<[HKT.URI<MReaderURI>, ...HKT.UHKT<F>], V<HKT.Auto>>({
    map_: (fa, f) => Mu.map_(fa, M.map(f)),
    crossWith_: (rfa, rfb, f) => Mu.bind_(rfa, (fa) => Mu.map_(rfb, (fb) => M.crossWith_(fa, fb, f))),
    bind_: (rma, f) =>
      Mu.asks((r) => pipe(rma, Mu.giveAll(r), Mu.runResult, M.bind(flow(f, Mu.giveAll(r), Mu.runResult)))),
    giveAll_: Mu.giveAll_,
    asks: (f) => Mu.asks(flow(f, M.pure)),
    pure: flow(M.pure, Mu.pure)
  })
}
