import type { Chunk } from '../../Chunk'
import type * as Ex from '../../Exit'
import type * as M from '../../Managed'
import type * as Q from '../../Queue'
import type { Stream } from '../core'

import * as O from '@principia/base/data/Option'

import * as I from '../../IO'
import { distributedWith_ } from './distributedWith'

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues(
  n: number,
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, Chunk<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => broadcastedQueues_(stream, n, maximumLag)
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number
): M.Managed<R, never, Chunk<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  const decider = I.succeed((_: number) => true)
  return distributedWith_(stream, n, maximumLag, (_) => decider)
}
