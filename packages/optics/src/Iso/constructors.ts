import { identity } from "@principia/core/Function";

import type { Iso } from "./model";

/*
 * -------------------------------------------
 * Iso Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function id<S>(): Iso<S, S> {
  return {
    get: identity,
    reverseGet: identity
  };
}
