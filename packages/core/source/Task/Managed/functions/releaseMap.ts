import * as T from "../_internal/effect";
import { pipe } from "../../../Function";
import { managed } from "../core";
import type { Managed } from "../model";
import type { ReleaseMap } from "../ReleaseMap";
import { noopFinalizer } from "../ReleaseMap";

/**
 * Provides access to the entire map of resources allocated by this {@link Managed}.
 */
export const releaseMap: Managed<unknown, never, ReleaseMap> = managed(
   pipe(
      T.ask<readonly [unknown, ReleaseMap]>(),
      T.map((tp) => [noopFinalizer, tp[1]])
   )
);
