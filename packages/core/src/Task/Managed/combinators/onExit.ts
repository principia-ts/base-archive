import * as T from "../_internal/task";
import { pipe } from "../../../Function";
import { sequential } from "../../ExecutionStrategy";
import * as Ex from "../../Exit";
import type { Exit } from "../../Exit/model";
import { Managed } from "../model";
import type { ReleaseMap } from "../ReleaseMap";
import { add, make } from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit_<R, E, A, R1>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => T.Task<R1, never, any>
) {
  return new Managed<R & R1, E, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.do,
        T.bindS("tp", () => T.ask<readonly [R & R1, ReleaseMap]>()),
        T.letS("r", (s) => s.tp[0]),
        T.letS("outerReleaseMap", (s) => s.tp[1]),
        T.bindS("innerReleaseMap", () => make),
        T.bindS("exitEA", (s) =>
          restore(T.giveAll_(T.result(T.map_(self.task, ([_, a]) => a)), [s.r, s.innerReleaseMap]))
        ),
        T.bindS("releaseMapEntry", (s) =>
          add((e) =>
            pipe(
              releaseAll(e, sequential())(s.innerReleaseMap),
              T.result,
              T.mapBoth(pipe(cleanup(s.exitEA), T.giveAll(s.r), T.result), (l, r) =>
                Ex.apSecond_(l, r)
              )
            )
          )(s.outerReleaseMap)
        ),
        T.bindS("a", (s) => T.done(s.exitEA)),
        T.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  );
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit<E, A, R1>(
  cleanup: (exit: Exit<E, A>) => T.Task<R1, never, any>
): <R>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  return (self) => onExit_(self, cleanup);
}
