import type { Lens } from "../Lens";

/*
 * -------------------------------------------
 * At Model
 * -------------------------------------------
 */

export interface At<S, I, A> {
  readonly at: (i: I) => Lens<S, A>;
}
