import { flow } from '@principia/base/function'

import { toManaged } from '../IO/combinators/toManaged'
import { makeRef } from './core'

/**
 * Creates a new `IORef` with the specified value.
 */
export const makeManaged = flow(makeRef, toManaged())
