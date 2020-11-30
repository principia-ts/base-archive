import { pipe } from "../../Function";
import { sequential } from "../../IO/ExecutionStrategy";
import * as F from "../../IO/Fiber";
import * as I from "../_internal/io";
import { Managed } from "../model";
import * as RM from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export function fork<R, E, A>(self: Managed<R, E, A>): Managed<R, never, F.Executor<E, A>> {
  return new Managed(
    I.uninterruptibleMask(({ restore }) =>
      pipe(
        I.do,
        I.bindS("tp", () => I.ask<readonly [R, RM.ReleaseMap]>()),
        I.letS("r", ({ tp }) => tp[0]),
        I.letS("outerReleaseMap", ({ tp }) => tp[1]),
        I.bindS("innerReleaseMap", () => RM.make),
        I.bindS("fiber", ({ innerReleaseMap, r }) =>
          restore(
            pipe(
              self.io,
              I.map(([_, a]) => a),
              I.forkDaemon,
              I.giveAll([r, innerReleaseMap] as const)
            )
          )
        ),
        I.bindS("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          RM.add((e) =>
            pipe(fiber, F.interrupt, I.andThen(releaseAll(e, sequential)(innerReleaseMap)))
          )(outerReleaseMap)
        ),
        I.map(({ fiber, releaseMapEntry }) => [releaseMapEntry, fiber])
      )
    )
  );
}
