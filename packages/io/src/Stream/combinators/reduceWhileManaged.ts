import type { Managed } from '../../Managed'
import type { Stream } from '../core'

import * as I from '../../IO'
import { reduceWhileManagedM_ } from './reduceWhileManagedM'

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhileManaged_<R, E, O, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
): Managed<R, E, S> {
  return reduceWhileManagedM_(ma, s, cont, (s, o) => I.succeed(f(s, o)))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhileManaged<O, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
): <R, E>(ma: Stream<R, E, O>) => Managed<R, E, S> {
  return (ma) => reduceWhileManaged_(ma, s, cont, f)
}
