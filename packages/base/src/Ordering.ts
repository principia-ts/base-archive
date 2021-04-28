import type * as P from '@principia/prelude'
import type { Ordering } from '@principia/prelude/Ordering'

import { EQ, GT, LT } from '@principia/prelude/Ordering'

export { EQ, GT, LT, Ordering }

export const sign = (n: number): Ordering => (n <= -1 ? LT : n >= 1 ? GT : EQ)

export const invert = (O: Ordering): Ordering => {
  switch (O) {
    case LT:
      return GT
    case GT:
      return LT
    case EQ:
      return EQ
  }
}

export const Monoid: P.Monoid<Ordering> = {
  combine_: (x, y) => (x !== 0 ? x : y),
  combine: (x) => (y) => (x !== 0 ? x : y),
  nat: 0
}
