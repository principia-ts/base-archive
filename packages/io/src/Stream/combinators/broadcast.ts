import type { Chunk } from '../../Chunk'
import type { Stream } from '../core'

import { pipe } from '@principia/base/data/Function'

import * as C from '../../Chunk'
import * as M from '../../Managed'
import { fromQueueWithShutdown } from '../core'
import { broadcastedQueues_ } from './broadcastedQueues'
import { flattenExitOption } from './flattenExitOption'

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast(
  n: number,
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, Chunk<Stream<unknown, E, O>>> {
  return (stream) => broadcast_(stream, n, maximumLag)
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number
): M.Managed<R, never, Chunk<Stream<unknown, E, O>>> {
  return pipe(
    broadcastedQueues_(stream, n, maximumLag),
    M.map(C.map((q) => flattenExitOption(fromQueueWithShutdown(q))))
  )
}
