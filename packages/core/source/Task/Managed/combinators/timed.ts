import { pipe } from "@principia/prelude";

import * as T from "../_internal/_task";
import * as E from "../../../Either";
import type { Has } from "../../../Has";
import * as O from "../../../Option";
import type { Clock } from "../../Clock";
import { HasClock } from "../../Clock";
import { sequential } from "../../ExecutionStrategy";
import * as Ex from "../../Exit";
import { Managed } from "../model";
import * as RM from "../ReleaseMap";
import { releaseAll } from "./releaseAll";
import { asksServiceManaged } from "./service";

export const timed = <R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, readonly [number, A]> =>
   asksServiceManaged(HasClock)(
      (clock) =>
         new Managed(
            T.asksM(([r, releaseMap]: readonly [R, RM.ReleaseMap]) =>
               pipe(
                  ma.task,
                  T.giveAll([r, releaseMap] as const),
                  T.timed,
                  T.map(([duration, [fin, a]]) => [fin, [duration, a]] as const),
                  T.giveService(HasClock)(clock)
               )
            )
         )
   );

export const timeout = (d: number) => <R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, O.Option<A>> =>
   new Managed(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.do,
            T.bindS("env", () => T.ask<readonly [R & Has<Clock>, RM.ReleaseMap]>()),
            T.letS("outerReleaseMap", ({ env }) => env[1]),
            T.letS("r", ({ env }) => env[0]),
            T.bindS("innerReleaseMap", () => RM.makeReleaseMap),
            T.bindS("earlyRelease", ({ outerReleaseMap, innerReleaseMap }) =>
               pipe(
                  outerReleaseMap,
                  RM.add((ex) => releaseAll(ex, sequential())(innerReleaseMap))
               )
            ),
            T.bindS("id", () => T.fiberId()),
            T.bindS("raceResult", ({ r, innerReleaseMap, id }) =>
               pipe(
                  ma.task,
                  T.giveAll([r, innerReleaseMap] as const),
                  T.raceWith(
                     T.as_(T.sleep(d), O.none()),
                     (result, sleeper) =>
                        T.apSecond_(sleeper.interruptAs(id), T.done(Ex.map_(result, ([_, a]) => E.right(a)))),
                     (_, resultFiber) => T.succeed(E.left(resultFiber))
                  ),
                  T.giveAll(r),
                  restore
               )
            ),
            T.bindS("a", ({ raceResult, id, innerReleaseMap }) =>
               E.fold_(
                  raceResult,
                  (fiber) =>
                     pipe(
                        fiber.interruptAs(id),
                        T.ensuring(pipe(innerReleaseMap, releaseAll(Ex.interrupt(id), sequential()))),
                        T.forkDaemon,
                        T.as(O.none())
                     ),
                  (result) => T.succeed(O.some(result))
               )
            ),
            T.map(({ earlyRelease, a }) => [earlyRelease, a] as const)
         )
      )
   );
