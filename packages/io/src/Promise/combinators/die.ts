import type { Promise } from '../model'

import * as I from '../../IO/core'
import { completeWith } from './completeWith'

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function die(e: unknown) {
  return <E, A>(promise: Promise<E, A>) => completeWith<E, A>(I.die(e))(promise)
}
