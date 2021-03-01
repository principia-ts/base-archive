import type * as HKT from '../HKT'
import type { Contravariant } from './Contravariant'
import type { Monoidal } from './Monoidal'

export interface ContravariantMonoidal<F extends HKT.URIS, C = HKT.Auto> extends Contravariant<F, C>, Monoidal<F, C> {}
