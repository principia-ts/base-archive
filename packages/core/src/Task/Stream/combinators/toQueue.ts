import { pipe } from "@principia/prelude";

import * as M from "../../Managed";
import * as T from "../../Task";
import * as XQ from "../../XQueue";
import type { Take } from "../internal/Take";
import type { Stream } from "../model";
import { intoManaged_ } from "./intoManaged";

export function toQueue_<R, E, O>(ma: Stream<R, E, O>, capacity = 2): M.Managed<R, never, XQ.Dequeue<Take<E, O>>> {
   return pipe(
      M.do,
      M.bindS("queue", () => T.toManaged_(XQ.makeBounded<Take<E, O>>(capacity), (_) => _.shutdown)),
      M.bindS("_", ({ queue }) => M.fork(intoManaged_(ma, queue))),
      M.map(({ queue }) => queue)
   );
}
