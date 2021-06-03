import { flow } from '../function'
import { toManaged } from '../IO/combinators/toManaged'
import { ref } from './core'

/**
 * Creates a new `IORef` with the specified value.
 */
export const managedRef = flow(ref, toManaged())
