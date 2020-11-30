import { pipe } from "@principia/prelude";

import * as XP from "../../Promise";
import * as I from "../_internal/_io";
import { mapM_ } from "../functor";
import type { IO, Managed } from "../model";
import { releaseMap } from "./releaseMap";

/**
 * Returns a memoized version of the specified Managed.
 */
export function memoize<R, E, A>(ma: Managed<R, E, A>): IO<Managed<R, E, A>> {
  return mapM_(releaseMap, (finalizers) =>
    I.gen(function* (_) {
      const promise = yield* _(XP.make<E, A>());
      const complete = yield* _(
        I.once(
          I.asksM((r: R) =>
            pipe(
              ma.io,
              I.giveAll([r, finalizers] as const),
              I.map(([_, a]) => a),
              I.to(promise)
            )
          )
        )
      );
      return pipe(complete, I.apSecond(XP.await(promise)), I.toManaged());
    })
  );
}
