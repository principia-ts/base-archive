import type { Exit } from "../../Exit";
import type { ReleaseMap } from "../ReleaseMap";

import { pipe } from "@principia/base/data/Function";

import { sequential } from "../../ExecutionStrategy";
import * as Ex from "../../Exit";
import * as I from "../_internal/io";
import { Managed } from "../core";
import { add, make } from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit_<R, E, A, R1>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
) {
  return new Managed<R & R1, E, A>(
    I.uninterruptibleMask(({ restore }) =>
      pipe(
        I.do,
        I.bindS("tp", () => I.ask<readonly [R & R1, ReleaseMap]>()),
        I.letS("r", (s) => s.tp[0]),
        I.letS("outerReleaseMap", (s) => s.tp[1]),
        I.bindS("innerReleaseMap", () => make),
        I.bindS("exitEA", (s) =>
          restore(I.giveAll_(I.result(I.map_(self.io, ([_, a]) => a)), [s.r, s.innerReleaseMap]))
        ),
        I.bindS("releaseMapEntry", (s) =>
          add((e) =>
            pipe(
              releaseAll(e, sequential)(s.innerReleaseMap),
              I.result,
              I.map2(pipe(cleanup(s.exitEA), I.giveAll(s.r), I.result), (l, r) =>
                Ex.apSecond_(l, r)
              )
            )
          )(s.outerReleaseMap)
        ),
        I.bindS("a", (s) => I.done(s.exitEA)),
        I.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  );
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit<E, A, R1>(
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
): <R>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  return (self) => onExit_(self, cleanup);
}
