import type { ReleaseMap } from "../ReleaseMap";

import { pipe } from "@principia/base/data/Function";

import * as I from "../_internal/io";
import { Managed } from "../core";
import { noopFinalizer } from "../ReleaseMap";

/**
 * Provides access to the entire map of resources allocated by this {@link Managed}.
 */
export const releaseMap: Managed<unknown, never, ReleaseMap> = new Managed(
  pipe(
    I.ask<readonly [unknown, ReleaseMap]>(),
    I.map((tp) => [noopFinalizer, tp[1]])
  )
);
