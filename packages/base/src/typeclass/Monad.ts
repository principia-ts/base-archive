import type * as HKT from '../HKT'
import type { Bind } from './Bind'
import type { Monoidal } from './Monoidal'

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Monoidal<F, C>, Bind<F, C> {}
