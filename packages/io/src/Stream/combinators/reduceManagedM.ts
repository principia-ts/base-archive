import type { IO } from '../../IO'
import type { Managed } from '../../Managed'
import type { Stream } from '../core'

import { constTrue } from '@principia/base/data/Function'

import { reduceWhileManagedM_ } from './reduceWhileManagedM'

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function reduceManagedM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  f: (s: S, o: O) => IO<R1, E1, S>
): Managed<R & R1, E | E1, S> {
  return reduceWhileManagedM_(ma, s, constTrue, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function reduceManagedM<O, R1, E1, S>(
  s: S,
  f: (s: S, o: O) => IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => Managed<R & R1, E | E1, S> {
  return (ma) => reduceManagedM_(ma, s, f)
}
