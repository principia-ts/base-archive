import type { Managed } from '../../Managed'
import type { Stream } from '../core'

import { constTrue } from '@principia/base/data/Function'

import * as I from '../../IO'
import { reduceWhileManagedM_ } from './reduceWhileManagedM'

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function reduceManaged_<R, E, O, S>(ma: Stream<R, E, O>, s: S, f: (s: S, o: O) => S): Managed<R, E, S> {
  return reduceWhileManagedM_(ma, s, constTrue, (s, o) => I.succeed(f(s, o)))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function reduceManaged<O, S>(s: S, f: (s: S, o: O) => S): <R, E>(ma: Stream<R, E, O>) => Managed<R, E, S> {
  return (ma) => reduceManaged_(ma, s, f)
}
