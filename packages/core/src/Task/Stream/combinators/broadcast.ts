import { pipe } from "@principia/prelude";

import * as A from "../../../Array";
import * as O from "../../../Option";
import type * as Ex from "../../Exit";
import * as M from "../../Managed";
import * as T from "../../Task";
import type * as XQ from "../../XQueue";
import { fromXQueueWithShutdown } from "../constructors";
import type { Stream } from "../model";
import { distributedWith_ } from "./distributed";
import { flattenExitOption } from "./flattenExitOption";

export function broadcastedQueues(
  n: number,
  maximumLag: number
): <R, E, O>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, ReadonlyArray<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => broadcastedQueues_(stream, n, maximumLag);
}

export function broadcastedQueues_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number
): M.Managed<R, never, ReadonlyArray<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  const decider = T.succeed((_: number) => true);
  return distributedWith_(stream, n, maximumLag, (_) => decider);
}

export function broadcast(
  n: number,
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, ReadonlyArray<Stream<unknown, E, O>>> {
  return (stream) => broadcast_(stream, n, maximumLag);
}

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
