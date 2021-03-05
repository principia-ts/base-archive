import type { AltMin } from './Alt'
import type { ApplicativeMin } from './Applicative'
import type { Empty, EmptyMin } from './Empty'

import { Alt } from './Alt'
import { Applicative } from './Applicative'
import * as HKT from './HKT'

export interface Alternative<F extends HKT.URIS, TC = HKT.Auto> extends Applicative<F, TC>, Empty<F, TC>, Alt<F, TC> {}

export type AlternativeMin<F extends HKT.URIS, C = HKT.Auto> = ApplicativeMin<F, C> & AltMin<F, C> & EmptyMin<F, C>

export function Alternative<F extends HKT.URIS, C = HKT.Auto>(F: AlternativeMin<F, C>): Alternative<F, C> {
  return HKT.instance<Alternative<F, C>>({
    ...Applicative(F),
    ...Alt(F),
    empty: F.empty
  })
}
