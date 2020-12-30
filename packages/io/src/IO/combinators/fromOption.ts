import type { FIO } from '../core'
import type { Option } from '@principia/base/data/Option'

import * as O from '@principia/base/data/Option'

import { fail, flatMap_, pure, total } from '../core'

/**
 * Lifts an `Option` into an `IO` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromOption<A>(m: () => Option<A>): FIO<Option<never>, A> {
  return flatMap_(total(m), (ma) => (ma._tag === 'None' ? fail(O.none()) : pure(ma.value)))
}
