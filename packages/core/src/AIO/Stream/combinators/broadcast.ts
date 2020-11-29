import { pipe } from "@principia/prelude";

import * as A from "../../../Array";
import * as O from "../../../Option";
import type * as Ex from "../../Exit";
import * as M from "../../Managed";
import * as T from "../../AIO";
import type * as XQ from "../../XQueue";
import { fromXQueueWithShutdown } from "../constructors";
import type { Stream } from "../model";
import { distributedWith_ } from "./distributed";
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
) => M.Managed<R, never, ReadonlyArray<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
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
): M.Managed<R, never, ReadonlyArray<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  const decider = T.succeed((_: number) => true);
  return distributedWith_(stream, n, maximumLag, (_) => decider);
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast(
  n: number,
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, ReadonlyArray<Stream<unknown, E, O>>> {
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
): M.Managed<R, never, ReadonlyArray<Stream<unknown, E, O>>> {
  return pipe(
    broadcastedQueues_(stream, n, maximumLag),
    M.map(A.map((q) => flattenExitOption(fromXQueueWithShutdown(q))))
  );
}
