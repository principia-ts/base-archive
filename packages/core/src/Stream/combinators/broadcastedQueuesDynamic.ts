import * as I from "../../IO";
import type * as Ex from "../../IO/Exit";
import * as M from "../../Managed";
import * as O from "../../Option";
import type * as Q from "../../Queue";
import { snd } from "../../Tuple";
import type { Stream } from "../model";
import { distributedWithDynamic_ } from "./distributedWithDynamic";

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
