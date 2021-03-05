import type { ApplicativeMin } from './Applicative'
import type { BindMin } from './Bind'

import { Applicative } from './Applicative'
import { Bind } from './Bind'
import * as HKT from './HKT'

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, Bind<F, C> {}

export type MonadMin<F extends HKT.URIS, C = HKT.Auto> = ApplicativeMin<F, C> & BindMin<F, C>

export function Monad<F extends HKT.URIS, C = HKT.Auto>(F: MonadMin<F, C>): Monad<F, C> {
  return HKT.instance<Monad<F, C>>({
    ...Applicative(F),
    ...Bind(F)
  })
}
