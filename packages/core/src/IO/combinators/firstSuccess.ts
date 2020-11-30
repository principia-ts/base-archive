import * as A from "../../Array/_core";
import type { NonEmptyArray } from "../../NonEmptyArray";
import * as NEA from "../../NonEmptyArray";
import type { IO } from "../model";
import { orElse_ } from "./orElse";

/**
 * Returns an `IO` that yields the value of the first
 * `IO` to succeed.
 */
export function firstSuccess<R, E, A>(fas: NonEmptyArray<IO<R, E, A>>): IO<R, E, A> {
  return A.reduce_(NEA.tail(fas), NEA.head(fas), (b, a) => orElse_(b, () => a));
}
