import type { IO } from '../core'

import { flatMap_ } from '../core'

/**
 * Repeats this effect forever (until the first failure).
 */
export function forever<R, E, A>(fa: IO<R, E, A>): IO<R, E, A> {
  return flatMap_(fa, () => forever(fa))
}
