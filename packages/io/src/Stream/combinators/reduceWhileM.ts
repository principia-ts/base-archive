import type { IO } from '../../IO'
import type { Stream } from '../core'

import * as I from '../../IO'
import * as M from '../../Managed'
import { reduceWhileManagedM_ } from './reduceWhileManagedM'

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhileM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => IO<R1, E1, S>
): IO<R & R1, E | E1, S> {
  return M.use_(reduceWhileManagedM_(ma, s, cont, f), I.succeed)
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhileM<O, R1, E1, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => IO<R & R1, E | E1, S> {
  return (ma) => reduceWhileM_(ma, s, cont, f)
}
