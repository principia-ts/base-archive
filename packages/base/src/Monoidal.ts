import type * as HKT from './HKT'
import type { Semigroupal, SemigroupalComposition } from './Semigroupal'
import type { Unit, UnitComposition } from './Unit'

export interface Monoidal<F extends HKT.URIS, C = HKT.Auto> extends Unit<F, C>, Semigroupal<F, C> {}

export interface MonoidalComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
  extends UnitComposition<F, G, CF, CG>,
    SemigroupalComposition<F, G, CF, CG> {}
