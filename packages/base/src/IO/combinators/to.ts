// tracing: off

import type { Promise } from '../../Promise'
import type { IO } from '../core'

import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import { bind_, result } from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 *
 * @trace call
 */
export function to_<R, E, A>(effect: IO<R, E, A>, p: Promise<E, A>): IO<R, never, boolean> {
  const trace = accessCallTrace()
  return uninterruptibleMask(traceFrom(trace, ({ restore }) => bind_(result(restore(effect)), p.done)))
}

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 *
 * @trace call
 */
export function to<E, A>(p: Promise<E, A>): <R>(effect: IO<R, E, A>) => IO<R, never, boolean> {
  const trace = accessCallTrace()
  return (effect) => traceCall(to_, trace)(effect, p)
}
