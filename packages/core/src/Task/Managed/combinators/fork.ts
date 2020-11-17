import * as T from "../_internal/task";
import { pipe } from "../../../Function";
import { sequential } from "../../ExecutionStrategy";
import * as F from "../../Fiber";
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
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.do,
            T.bindS("tp", () => T.ask<readonly [R, RM.ReleaseMap]>()),
            T.letS("r", ({ tp }) => tp[0]),
            T.letS("outerReleaseMap", ({ tp }) => tp[1]),
            T.bindS("innerReleaseMap", () => RM.make),
            T.bindS("fiber", ({ innerReleaseMap, r }) =>
               restore(
                  pipe(
                     self.task,
                     T.map(([_, a]) => a),
                     T.forkDaemon,
                     T.giveAll([r, innerReleaseMap] as const)
                  )
               )
            ),
            T.bindS("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
               RM.add((e) => pipe(fiber, F.interrupt, T.andThen(releaseAll(e, sequential())(innerReleaseMap))))(
                  outerReleaseMap
               )
            ),
            T.map(({ fiber, releaseMapEntry }) => [releaseMapEntry, fiber])
         )
      )
   );
}
