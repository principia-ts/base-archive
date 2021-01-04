import type { Fail } from './Fail'
import type * as HKT from './HKT'
import type { Monad } from './Monad'

export interface MonadFail<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C>, Fail<F, C> {}
