import type { Clock } from "../../Clock";
import type * as RM from "../ReleaseMap";
import type { Has } from "@principia/base/data/Has";

import { pipe } from "@principia/base/data/Function";

import { HasClock } from "../../Clock";
import * as I from "../_internal/_io";
import { Managed } from "../core";
import { asksServiceManaged } from "./service";

export function timed<R, E, A>(
  ma: Managed<R, E, A>
): Managed<R & Has<Clock>, E, readonly [number, A]> {
  return asksServiceManaged(HasClock)(
    (clock) =>
      new Managed(
        I.asksM(([r, releaseMap]: readonly [R, RM.ReleaseMap]) =>
          pipe(
            ma.io,
            I.giveAll([r, releaseMap] as const),
            I.timed,
            I.map(([duration, [fin, a]]) => [fin, [duration, a]] as const),
            I.giveService(HasClock)(clock)
          )
        )
      )
  );
}
