import { pipe } from "@principia/prelude";

import * as E from "../../Either";
import type { Has } from "../../Has";
import type { Clock } from "../../IO/Clock";
import { sequential } from "../../IO/ExecutionStrategy";
import * as Ex from "../../IO/Exit";
import * as O from "../../Option";
import * as I from "../_internal/_io";
import { Managed } from "../model";
import * as RM from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

export function timeout(d: number) {
  return <R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, O.Option<A>> =>
    new Managed(
      I.uninterruptibleMask(({ restore }) =>
        pipe(
          I.do,
          I.bindS("env", () => I.ask<readonly [R & Has<Clock>, RM.ReleaseMap]>()),
          I.letS("outerReleaseMap", ({ env }) => env[1]),
          I.letS("r", ({ env }) => env[0]),
          I.bindS("innerReleaseMap", () => RM.make),
          I.bindS("earlyRelease", ({ outerReleaseMap, innerReleaseMap }) =>
            pipe(
              outerReleaseMap,
              RM.add((ex) => releaseAll(ex, sequential)(innerReleaseMap))
            )
          ),
          I.bindS("id", () => I.fiberId()),
          I.bindS("raceResult", ({ r, innerReleaseMap, id }) =>
            pipe(
              ma.io,
              I.giveAll([r, innerReleaseMap] as const),
              I.raceWith(
                I.as_(I.sleep(d), () => O.none()),
                (result, sleeper) =>
                  I.apSecond_(
                    sleeper.interruptAs(id),
                    I.done(Ex.map_(result, ([_, a]) => E.right(a)))
                  ),
                (_, resultFiber) => I.succeed(E.left(resultFiber))
              ),
              I.giveAll(r),
              restore
            )
          ),
          I.bindS("a", ({ raceResult, id, innerReleaseMap }) =>
            E.fold_(
              raceResult,
              (fiber) =>
                pipe(
                  fiber.interruptAs(id),
                  I.ensuring(pipe(innerReleaseMap, releaseAll(Ex.interrupt(id), sequential))),
                  I.forkDaemon,
                  I.as(() => O.none())
                ),
              (result) => I.succeed(O.some(result))
            )
          ),
          I.map(({ earlyRelease, a }) => [earlyRelease, a] as const)
        )
      )
    );
}
