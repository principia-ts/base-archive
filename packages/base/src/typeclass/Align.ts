import type * as HKT from '../HKT'
import type { Semialign } from './Semialign'

export interface Align<F extends HKT.URIS, C = HKT.Auto> extends Semialign<F, C> {
  readonly nil: NilFn<F, C>
}

export interface NilFn<F extends HKT.URIS, C = HKT.Auto> {
  (): HKT.Kind<
    F,
    C,
    HKT.Initial<C, 'N'>,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    HKT.Initial<C, 'E'>,
    any
  >
}
