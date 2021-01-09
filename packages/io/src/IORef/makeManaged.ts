import { flow } from '@principia/base/Function'

import { toManaged } from '../IO/combinators/toManaged'
import { make } from './core'
/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManaged = flow(make, toManaged())
