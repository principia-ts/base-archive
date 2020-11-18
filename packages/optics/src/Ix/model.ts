import type { Optional } from "../Optional";

/*
 * -------------------------------------------
 * Ix Model
 * -------------------------------------------
 */

export interface Ix<S, I, A> {
  readonly index: (i: I) => Optional<S, A>;
}
