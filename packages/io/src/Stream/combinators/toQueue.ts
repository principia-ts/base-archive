import type { Stream } from "../core";
import type { Take } from "../Take";

import { pipe } from "@principia/base/data/Function";

import * as I from "../../IO";
import * as M from "../../Managed";
import * as XQ from "../../Queue";
import { intoManaged_ } from "./intoManaged";

export function toQueue_<R, E, O>(
  ma: Stream<R, E, O>,
  capacity = 2
): M.Managed<R, never, XQ.Dequeue<Take<E, O>>> {
  return pipe(
    M.do,
    M.bindS("queue", () => I.toManaged_(XQ.makeBounded<Take<E, O>>(capacity), (_) => _.shutdown)),
    M.bindS("_", ({ queue }) => M.fork(intoManaged_(ma, queue))),
    M.map(({ queue }) => queue)
  );
}

export function toQueue(
  capacity = 2
): <R, E, O>(ma: Stream<R, E, O>) => M.Managed<R, never, XQ.Dequeue<Take<E, O>>> {
  return (ma) => toQueue_(ma, capacity);
}

export function toQueueUnbounded<R, E, O>(
  ma: Stream<R, E, O>
): M.Managed<R, never, XQ.Dequeue<Take<E, O>>> {
  return M.gen(function* (_) {
    const queue = yield* _(I.toManaged_(XQ.makeUnbounded<Take<E, O>>(), (q) => q.shutdown));
    yield* _(M.fork(intoManaged_(ma, queue)));
    return queue;
  });
}
