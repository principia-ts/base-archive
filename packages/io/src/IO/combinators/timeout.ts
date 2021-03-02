import type { Clock } from '../../Clock'
import type { IO } from '../core'
import type { Has } from '@principia/base/Has'

import * as O from '@principia/base/Option'

import { timeoutTo_ } from './timeoutTo'

/**
 * Returns an IO that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 */
export function timeout_<R, E, A>(ma: IO<R, E, A>, d: number): IO<R & Has<Clock>, E, O.Option<A>> {
  return timeoutTo_(ma, d, O.None(), O.Some)
}

/**
 * Returns an IO that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 */
export function timeout(d: number) {
  return <R, E, A>(ma: IO<R, E, A>): IO<R & Has<Clock>, E, O.Option<A>> => timeout_(ma, d)
}
