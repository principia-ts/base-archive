import { pipe } from "@principia/prelude";

import * as XP from "../../XPromise";
import * as T from "../_internal/_aio";
import { mapM_ } from "../functor";
import type { IO, Managed } from "../model";
import { releaseMap } from "./releaseMap";

/**
 * Returns a memoized version of the specified Managed.
 */
export function memoize<R, E, A>(ma: Managed<R, E, A>): IO<Managed<R, E, A>> {
  return mapM_(releaseMap, (finalizers) =>
    T.gen(function* (_) {
      const promise = yield* _(XP.make<E, A>());
      const complete = yield* _(
        T.once(
          T.asksM((r: R) =>
            pipe(
              ma.aio,
              T.giveAll([r, finalizers] as const),
              T.map(([_, a]) => a),
              T.to(promise)
            )
          )
        )
      );
      return pipe(complete, T.apSecond(XP.await(promise)), T.toManaged());
    })
  );
}
