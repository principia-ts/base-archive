import type { IO } from "../core";
import type { NonEmptyArray } from "@principia/base/data/NonEmptyArray";

import * as A from "@principia/base/data/Array";
import * as NEA from "@principia/base/data/NonEmptyArray";

import { orElse_ } from "./orElse";

/**
 * Returns an `IO` that yields the value of the first
 * `IO` to succeed.
 */
export function firstSuccess<R, E, A>(fas: NonEmptyArray<IO<R, E, A>>): IO<R, E, A> {
  return A.foldLeft_(NEA.tail(fas), NEA.head(fas), (b, a) => orElse_(b, () => a));
}
