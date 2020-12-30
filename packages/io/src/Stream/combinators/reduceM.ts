import type { IO } from '../../IO'
import type { Stream } from '../core'

import { constTrue } from '@principia/base/data/Function'

import * as I from '../../IO'
import * as M from '../../Managed'
import { reduceWhileManagedM_ } from './reduceWhileManagedM'

/**
 * Executes an effectful fold over the stream of values.
 */
export function reduceM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  f: (s: S, o: O) => IO<R1, E1, S>
): IO<R & R1, E | E1, S> {
  return M.use_(reduceWhileManagedM_(ma, s, constTrue, f), I.succeed)
}

/**
 * Executes an effectful fold over the stream of values.
 */
export function reduceM<O, R1, E1, S>(
  s: S,
  f: (s: S, o: O) => IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => IO<R & R1, E | E1, S> {
  return (ma) => reduceM_(ma, s, f)
}
