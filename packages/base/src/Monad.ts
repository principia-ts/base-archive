import type { Applicative } from './Applicative'
import type { Chain } from './Chain'
import type * as HKT from './HKT'

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, Chain<F, C> {}
