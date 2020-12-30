import type { Stream } from '../core'

import { tuple } from '@principia/base/data/Function'

import { chain_, map_ } from '../core'

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zipWith` for the more common point-wise variant.
 */
export function crossWith_<R, E, O, R1, E1, O1, C>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>,
  f: (o: O, o1: O1) => C
): Stream<R & R1, E | E1, C> {
  return chain_(stream, (o) => map_(that, (o1) => f(o, o1)))
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zipWith` for the more common point-wise variant.
 */
export function crossWith<O, R1, E1, O1, C>(
  that: Stream<R1, E1, O1>,
  f: (o: O, o1: O1) => C
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, C> {
  return (stream) => crossWith_(stream, that, f)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zip` and for the more common point-wise variant.
 */
export function cross_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E | E1, readonly [O, O1]> {
  return crossWith_(stream, that, tuple)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zip` and for the more common point-wise variant.
 */
export function cross<R1, E1, O1>(
  that: Stream<R1, E1, O1>
): <R, E, O>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, readonly [O, O1]> {
  return (stream) => cross_(stream, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apFirst` for the more common point-wise variant.
 */
export function crossFirst_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O> {
  return crossWith_(stream, that, (o, _) => o)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apFirst` for the more common point-wise variant.
 */
export function crossFirst<R1, E1, O1>(
  that: Stream<R1, E1, O1>
): <R, E, O>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, O> {
  return (stream) => crossFirst_(stream, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apSecond` for the more common point-wise variant.
 */
export function crossSecond_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return crossWith_(stream, that, (_, o1) => o1)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apSecond` for the more common point-wise variant.
 */
export function crossSecond<R1, E1, O1>(
  that: Stream<R1, E1, O1>
): <R, E, O>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (stream) => crossSecond_(stream, that)
}
