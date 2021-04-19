import type { CustomRuntime } from '../../IO/runtime'
import type { Layer } from '../core'

import { makeCustomRuntime } from '../../IO/runtime'
import { build } from '../core'
import * as I from '../internal/io'
import * as M from '../internal/managed'

/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, CustomRuntime<A, unknown>> {
  return M.bind_(build(_), (a) => M.fromEffect(I.platform((p) => I.effectTotal(() => makeCustomRuntime(a, p)))))
}
