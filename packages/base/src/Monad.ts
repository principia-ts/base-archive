import type { Applicative, ApplicativeMin } from './Applicative'
import type { Bind, BindMin } from './Bind'

import { getApplicative } from './Applicative'
import { getBind } from './Bind'
import * as HKT from './HKT'

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, Bind<F, C> {}

export type MonadMin<F extends HKT.URIS, C = HKT.Auto> = ApplicativeMin<F, C> & BindMin<F, C>

export function getMonad<F extends HKT.URIS, C = HKT.Auto>(F: MonadMin<F, C>): Monad<F, C> {
  return HKT.instance<Monad<F, C>>({
    ...getApplicative(F),
    ...getBind(F)
  })
}
