import type { SemimonoidalFunctor, SemimonoidalFunctor2 } from './SemimonoidalFunctor'
import type { Unit, Unit2 } from './Unit'

import { flow } from './Function'
import * as HKT from './HKT'
import { getSemimonoidalFunctorComposition } from './SemimonoidalFunctor'

export interface MonoidalFunctor<F extends HKT.URIS, C = HKT.Auto> extends SemimonoidalFunctor<F, C>, Unit<F, C> {}

export interface MonoidalFunctor2<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends SemimonoidalFunctor2<F, G, CF, CG>,
    Unit2<F, G, CF, CG> {}

export function getMonoidalFunctorComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
  F: MonoidalFunctor<F, CF>,
  G: MonoidalFunctor<G, CG>
): MonoidalFunctor2<F, G, CF, CG> {
  return HKT.instance({
    ...getSemimonoidalFunctorComposition(F, G),
    unit: flow(G.unit, F.unit)
  })
}
