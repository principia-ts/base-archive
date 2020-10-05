import { pipe } from "@principia/core/Function";

import * as T from "../_internal/effect";
import { sequential } from "../../ExecutionStrategy";
import * as Ex from "../../Exit/core";
import { managed } from "../core";
import { Managed } from "../Managed";
import { add, makeReleaseMap, ReleaseMap } from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const onExitFirst = <E, A, R1>(
   cleanup: (exit: Ex.Exit<E, A>) => T.Effect<R1, never, any>
) => <R>(self: Managed<R, E, A>) => _onExitFirst(self, cleanup);

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const _onExitFirst = <R, E, A, R1>(
   self: Managed<R, E, A>,
   cleanup: (exit: Ex.Exit<E, A>) => T.Effect<R1, never, any>
) =>
   managed<R & R1, E, A>(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.of,
            T.bindS("tp", () => T.environment<readonly [R & R1, ReleaseMap]>()),
            T.letS("r", (s) => s.tp[0]),
            T.letS("outerReleaseMap", (s) => s.tp[1]),
            T.bindS("innerReleaseMap", () => makeReleaseMap),
            T.bindS("exitEA", (s) =>
               restore(
                  T._provideAll(T.result(T._map(self.effect, ([_, a]) => a)), [
                     s.r,
                     s.innerReleaseMap
                  ])
               )
            ),
            T.bindS("releaseMapEntry", (s) =>
               add((e) =>
                  T.flatten(
                     T._mapBoth(
                        T.result(T._provideAll(cleanup(s.exitEA), s.r)),
                        T.result(releaseAll(e, sequential())(s.innerReleaseMap)),
                        (l, r) => T.done(Ex._apSecond(l, r))
                     )
                  )
               )(s.outerReleaseMap)
            ),
            T.bindS("a", (s) => T.done(s.exitEA)),
            T.map((s) => [s.releaseMapEntry, s.a])
         )
      )
   );
