import type { Applicative } from './Applicative'
import type { Bind } from './Bind'
import type * as HKT from './HKT'

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, Bind<F, C> {}
