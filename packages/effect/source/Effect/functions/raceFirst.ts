import { pipe } from "@principia/core/Function";

import type { Exit } from "../../Exit/Exit";
import { chain, done, result } from "../core";
import type { Effect } from "../Effect";
import { race_ } from "./race";

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 */
export const raceFirst = <R1, E1, A1>(that: Effect<R1, E1, A1>) => <R, E, A>(
   ef: Effect<R, E, A>
): Effect<R & R1, E | E1, A | A1> =>
   pipe(
      race_(result(ef), result(that)),
      chain((a) => done(a as Exit<E | E1, A | A1>))
   );
