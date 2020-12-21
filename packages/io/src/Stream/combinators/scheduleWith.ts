import type { Clock } from "../../Clock";
import type { Has } from "@principia/base/data/Has";

import { pipe } from "@principia/base/data/Function";

import * as C from "../../Chunk";
import * as T from "../../IO";
import * as M from "../../Managed";
import * as SC from "../../Schedule";
import * as BPull from "../BufferedPull";
import { Stream } from "../core";

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith<R1, O, B>(schedule: SC.Schedule<R1, O, B>) {
  return <C, D>(f: (o: O) => C, g: (b: B) => D) => <R, E>(
    self: Stream<R, E, O>
  ): Stream<R & R1 & Has<Clock>, E, C | D> => {
    return new Stream(
      pipe(
        M.do,
        M.bindS("as", () => M.mapM_(self.proc, BPull.make)),
        M.bindS("driver", () => T.toManaged_(SC.driver(schedule))),
        M.letS("pull", ({ as, driver }) =>
          T.flatMap_(BPull.pullElement(as), (o) =>
            T.orElse_(
              T.as_(driver.next(o), () => C.single(f(o))),
              () =>
                T.apFirst_(
                  T.map_(T.orDie(driver.last), (b) => [f(o), g(b)]),
                  driver.reset
                )
            )
          )
        ),
        M.map(({ pull }) => pull)
      )
    );
  };
}
