import * as A from "../../../Array";
import type { NonEmptyArray } from "../../../NonEmptyArray";
import * as NEA from "../../../NonEmptyArray";
import type { Effect } from "../model";
import { orElse_ } from "./orElse";

/**
 * Returns an `Effect` that yields the value of the first
 * `Effect` to succeed.
 */
export const firstSuccess = <R, E, A>(fas: NonEmptyArray<Effect<R, E, A>>) =>
   A.reduce_(NEA.tail(fas), NEA.head(fas), (b, a) => orElse_(b, () => a));
