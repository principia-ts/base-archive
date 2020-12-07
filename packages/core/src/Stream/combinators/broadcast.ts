import { flow, pipe } from "@principia/prelude";

import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import * as I from "../../IO";
import type * as Ex from "../../IO/Exit";
import * as M from "../../Managed";
import * as O from "../../Option";
import type * as Q from "../../Queue";
import { snd } from "../../Tuple";
import { fromXQueueWithShutdown } from "../constructors";
import type { Stream } from "../model";
import { distributedWith_, distributedWithDynamic_ } from "./distributed";
import { flattenExitOption } from "./flattenExitOption";

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
): <R, E, O>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, Chunk<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => broadcastedQueues_(stream, n, maximumLag);
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
  const decider = I.succeed((_: number) => true);
  return distributedWith_(stream, n, maximumLag, (_) => decider);
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, I.UIO<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return M.map_(
    distributedWithDynamic_(
      stream,
      maximumLag,
      () => I.succeed((_) => true),
      () => I.unit()
    ),
    I.map(snd)
  );
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic(
  maximumLag: number
): <R, E, O>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, I.UIO<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (ma) => broadcastedQueuesDynamic_(ma, maximumLag);
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast(
  n: number,
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, Chunk<Stream<unknown, E, O>>> {
  return (stream) => broadcast_(stream, n, maximumLag);
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
    M.map(C.map((q) => flattenExitOption(fromXQueueWithShutdown(q))))
  );
}

export function broadcastDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, I.UIO<Stream<unknown, E, O>>> {
  return M.map_(
    M.map_(
      distributedWithDynamic_(
        stream,
        maximumLag,
        (_) => I.succeed((_) => true),
        (_) => I.unit()
      ),
      I.map(snd)
    ),
    I.map(flow(fromXQueueWithShutdown, flattenExitOption))
  );
}

export function broadcastDynamic(
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, I.UIO<Stream<unknown, E, O>>> {
  return (stream) => broadcastDynamic_(stream, maximumLag);
}
