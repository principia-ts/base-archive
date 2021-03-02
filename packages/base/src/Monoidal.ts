import type { Pure, Pure2 } from './Pure'
import type { Semimonoidal, Semimonoidal2 } from './Semimonoidal'

import { flow } from './Function'
import * as HKT from './HKT'
import { getSemimonoidalComposition } from './Semimonoidal'

export interface Monoidal<F extends HKT.URIS, C = HKT.Auto> extends Semimonoidal<F, C>, Pure<F, C> {}

export interface Monoidal2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends Semimonoidal2<F, G, CF, CG>,
    Pure2<F, G, CF, CG> {}

export function getMonoidalComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: Monoidal<F, CF>,
  G: Monoidal<G, CG>
): Monoidal2<F, G, CF, CG> {
  return HKT.instance({
    ...getSemimonoidalComposition(F, G),
    pure: flow(G.pure, F.pure)
  })
}
