import type { Apply, Apply2 } from './Apply'
import type { MonoidalFunctor, MonoidalFunctor2 } from './MonoidalFunctor'
import type { Pure, Pure2 } from './Pure'

import { getApplyComposition } from './Apply'
import { flow } from './Function'
import * as HKT from './HKT'
import { getMonoidalFunctorComposition } from './MonoidalFunctor'

/**
 * A lax monoidal endofunctor with tensorial strength
 *
 * `Applicative` is isomorphic to `MonoidalFunctor`
 */
export interface Applicative<F extends HKT.URIS, C = HKT.Auto> extends Apply<F, C>, MonoidalFunctor<F, C>, Pure<F, C> {}

export interface Applicative2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends Apply2<F, G, CF, CG>,
    MonoidalFunctor2<F, G, CF, CG>,
    Pure2<F, G, CF, CG> {}

export function getApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Applicative<F, CF>,
  G: Applicative<G, CG>
): Applicative2<F, G, CF, CG> {
  return HKT.instance<Applicative2<F, G, CF, CG>>({
    ...getApplyComposition(F, G),
    ...getMonoidalFunctorComposition(F, G),
    pure: flow(G.pure, F.pure)
  })
}
