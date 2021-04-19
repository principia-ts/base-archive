import type { ExecutionStrategy } from '../../ExecutionStrategy'
import type { Managed } from '../core'

import { makeExit_ } from '../core'
import * as RM from '../ReleaseMap'
import { releaseAll } from './releaseAll'

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 */
export function makeManagedReleaseMap(es: ExecutionStrategy): Managed<unknown, never, RM.ReleaseMap> {
  return makeExit_(RM.make, (rm, e) => releaseAll(e, es)(rm))
}
