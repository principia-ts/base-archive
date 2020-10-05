import { identity } from "@principia/core/Function";

import type { Iso } from "./Iso";

/*
 * -------------------------------------------
 * Iso Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export const id = <S>(): Iso<S, S> => ({
   get: identity,
   reverseGet: identity
});
