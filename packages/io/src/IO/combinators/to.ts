import type { Promise } from '../../Promise'
import type { IO } from '../core'

import { flatMap_, result } from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to_<R, E, A>(effect: IO<R, E, A>, p: Promise<E, A>): IO<R, never, boolean> {
  return uninterruptibleMask(({ restore }) => flatMap_(result(restore(effect)), p.done))
}

/**
 * Returns an IO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: Promise<E, A>): <R>(effect: IO<R, E, A>) => IO<R, never, boolean> {
  return (effect) => to_(effect, p)
}
