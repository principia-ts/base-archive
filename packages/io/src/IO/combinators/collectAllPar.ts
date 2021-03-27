// tracing: off

import type { IO } from '../core'

import { flow, identity } from '@principia/base/function'
import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { foreachPar_ } from './foreachPar'
import { foreachUnitPar_ } from './foreachUnitPar'

/**
 * @trace call
 */
export function collectAllPar<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, readonly A[]> {
  const trace = accessCallTrace()
  return foreachPar_(mas, traceFrom(trace, flow(identity)))
}

/**
 * @trace call
 */
export function collectAllUnitPar<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, void> {
  const trace = accessCallTrace()
  return foreachUnitPar_(mas, traceFrom(trace, flow(identity)))
}
