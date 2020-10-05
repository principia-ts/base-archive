import * as E from "@principia/core/Either";

import * as C from "../../Cause";
import { _chain, _foldCauseM, halt, pure } from "../core";
import type { Effect } from "../Effect";

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export const _tapError = <R, E, A, R1, E1>(ef: Effect<R, E, A>, f: (e: E) => Effect<R1, E1, any>) =>
   _foldCauseM(
      ef,
      (c) =>
         E._fold(
            C.failureOrCause(c),
            (e) => _chain(f(e), () => halt(c)),
            (_) => halt(c)
         ),
      pure
   );

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export const tapError = <E, R1, E1>(f: (e: E) => Effect<R1, E1, any>) => <R, A>(
   ef: Effect<R, E, A>
) => _tapError(ef, f);
