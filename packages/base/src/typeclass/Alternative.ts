import type * as HKT from '../HKT'
import type { Alt } from './Alt'
import type { Empty } from './Empty'
import type { Monoidal } from './Monoidal'

export interface Alternative<F extends HKT.URIS, TC = HKT.Auto> extends Monoidal<F, TC>, Empty<F, TC>, Alt<F, TC> {}
