import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'

import { constant } from '@principia/base/function'
import * as O from '@principia/base/Option'

/*
 * -------------------------------------------
 * Optional Model
 * -------------------------------------------
 */

export interface Optional<S, A> {
  readonly getOption: (s: S) => Option<A>
  readonly set: (a: A) => (s: S) => S
}

export type V = HKT.V<'I', '_'>

export function id<S>(): Optional<S, S> {
  return {
    getOption: O.Some,
    set: constant
  }
}
