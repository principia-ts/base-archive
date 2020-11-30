import { pipe } from "../../Function";
import { sequential } from "../../IO/ExecutionStrategy";
import type { Exit } from "../../IO/Exit";
import * as Ex from "../../IO/Exit";
import * as I from "../_internal/io";
import { Managed } from "../model";
import type { ReleaseMap } from "../ReleaseMap";
import { add, make } from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export function onExitFirst_<R, E, A, R1>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
): Managed<R & R1, E, A> {
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
            I.flatten(
              I.zipWith_(
                I.result(I.giveAll_(cleanup(s.exitEA), s.r)),
                I.result(releaseAll(e, sequential)(s.innerReleaseMap)),
                (l, r) => I.done(Ex.apSecond_(l, r))
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
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export function onExitFirst<E, A, R1>(
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
): <R>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  return (self) => onExitFirst_(self, cleanup);
}
