import type { Functor } from './Functor'
import type * as HKT from './HKT'
import type { Semimonoidal } from './Semimonoidal'

export interface SemimonoidalContravariant<F extends HKT.URIS, C = HKT.Auto>
  extends Functor<F, C>,
    Semimonoidal<F, C> {}
