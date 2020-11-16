import { flow, pipe } from "@principia/prelude";

import * as L from "../../../List";
import * as O from "../../../Option";
import type * as Ex from "../../Exit";
import * as M from "../../Managed";
import * as T from "../../Task";
import type * as XQ from "../../XQueue";
import { fromXQueueWithShutdown } from "../constructors";
import type { Stream } from "../model";
import { distributedWith_ } from "./distributed";
import { flattenExitOption } from "./flattenExitOption";

/**
 * Not working
 */
export function broadcast_<R, E, O>(
   ma: Stream<R, E, O>,
   n: number,
   maximumLag: number
): M.Managed<R, never, L.List<Stream<unknown, E, O>>> {
   return pipe(ma, broadcastedQueues(n, maximumLag), M.map(L.map(flow(fromXQueueWithShutdown, flattenExitOption))));
}

/**
 * Not working
 */
export function broadcast(
   n: number,
   maximumLag: number
): <R, E, O>(ma: Stream<R, E, O>) => M.Managed<R, never, L.List<Stream<unknown, E, O>>> {
   return (ma) => broadcast_(ma, n, maximumLag);
}

/**
 * Not working
 */
export function broadcastedQueues_<R, E, O>(
   ma: Stream<R, E, O>,
   n: number,
   maximumLag: number
): M.Managed<R, never, L.List<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
   const decider = T.succeed((_: number) => true);
   return distributedWith_(ma, n, maximumLag, () => decider);
}

/**
 * Not working
 */
export function broadcastedQueues(
   n: number,
   maximumLag: number
): <R, E, O>(ma: Stream<R, E, O>) => M.Managed<R, never, L.List<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
   return (ma) => broadcastedQueues_(ma, n, maximumLag);
}
