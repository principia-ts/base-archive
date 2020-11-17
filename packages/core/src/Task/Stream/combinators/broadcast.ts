import { pipe } from "@principia/prelude";

import * as M from "../../Managed";
import { fromXQueueWithShutdown } from "../constructors";
import type { Stream } from "../model";
import { distributedWith } from "./distributed";
import { flattenExitOption } from "./flattenExitOption";

export function broadcastedQueues<R, E, O>(
   stream: Stream<R, E, O>,
   n: number,
   maximumLag: number
): M.Managed<R, never, ReadonlyArray<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
   const decider = T.succeed((_: number) => true);
   return distributedWith(stream, n, maximumLag, (_) => decider);
}

export function broadcast<R, E, O>(
   stream: Stream<R, E, O>,
   n: number,
   maximumLag: number
): M.Managed<R, never, ReadonlyArray<Stream<unknown, E, O>>> {
   return pipe(
      broadcastedQueues(stream, n, maximumLag),
      M.map(A.map((q) => flattenExitOption(fromXQueueWithShutdown(q))))
   );
}
