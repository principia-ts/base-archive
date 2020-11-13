import { pipe } from "@principia/core/Function";

import * as _ from "../internal";
import type { Iso } from "../Iso";
import type { At } from "./model";

/*
 * -------------------------------------------
 * At Constructors
 * -------------------------------------------
 */

/**
 * Lift an instance of `At` using an `Iso`
 *
 * @category Constructors
 * @since 1.0.0
 */
export function fromIso<T, S>(iso: Iso<T, S>): <I, A>(sia: At<S, I, A>) => At<T, I, A> {
   return (sia) => ({
      at: (i) => pipe(iso, _.isoAsLens, _.lensComposeLens(sia.at(i)))
   });
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export const atRecord = _.atRecord;
