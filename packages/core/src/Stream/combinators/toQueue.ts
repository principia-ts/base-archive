import { pipe } from "@principia/prelude";

import * as I from "../../IO";
import * as M from "../../Managed";
import * as XQ from "../../Queue";
import type { Stream } from "../model";
import type { Take } from "../Take";
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
