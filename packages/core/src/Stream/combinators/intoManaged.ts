import { flow, pipe } from "@principia/prelude";

import * as I from "../../IO";
import * as C from "../../IO/Cause";
import type { Managed } from "../../Managed";
import * as M from "../../Managed";
import * as O from "../../Option";
import type * as XQ from "../../Queue";
import type { Stream } from "../model";
import * as Take from "../Take";

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged<E, O, R1, E1>(
  queue: XQ.XQueue<R1, never, never, unknown, Take.Take<E | E1, O>, any>
): <R>(ma: Stream<R, E, O>) => Managed<R & R1, E | E1, void> {
  return (ma) => intoManaged_(ma, queue);
}

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged_<R, E, O, R1, E1>(
  ma: Stream<R, E, O>,
  queue: XQ.XQueue<R1, never, never, unknown, Take.Take<E | E1, O>, any>
): Managed<R & R1, E | E1, void> {
  return pipe(
    M.do,
    M.bindS("as", () => ma.proc),
    M.letS("pull", ({ as }) => {
      const go: I.IO<R & R1, never, void> = I.foldCauseM_(
        as,
        flow(
          C.sequenceCauseOption,
          O.fold(
            () => I.asUnit(queue.offer(Take.end)),
            (c) => I.andThen_(queue.offer(Take.halt(c)), go)
          )
        ),
        (a) => I.andThen_(queue.offer(Take.chunk(a)), go)
      );
      return go;
    }),
    M.chain(({ pull }) => I.toManaged_(pull))
  );
}
