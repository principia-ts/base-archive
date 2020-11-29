import * as A from "../../../Array/_core";
import type { NonEmptyArray } from "../../../NonEmptyArray";
import * as NEA from "../../../NonEmptyArray";
import type { AIO } from "../model";
import { orElse_ } from "./orElse";

/**
 * Returns an `AIO` that yields the value of the first
 * `AIO` to succeed.
 */
export function firstSuccess<R, E, A>(fas: NonEmptyArray<AIO<R, E, A>>): AIO<R, E, A> {
  return A.reduce_(NEA.tail(fas), NEA.head(fas), (b, a) => orElse_(b, () => a));
}
