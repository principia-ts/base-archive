import type { Runtime } from '../../IO/combinators/runtime'
import type { Layer } from '../core'

import { makeRuntime } from '../../IO/combinators/runtime'
import { build } from '../core'
import * as M from '../internal/managed'

/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, Runtime<A>> {
  return M.map_(build(_), makeRuntime)
}
