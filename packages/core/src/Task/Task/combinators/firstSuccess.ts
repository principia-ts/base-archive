import * as A from "../../../Array/_core";
import type { NonEmptyArray } from "../../../NonEmptyArray";
import * as NEA from "../../../NonEmptyArray";
import type { Task } from "../model";
import { orElse_ } from "./orElse";

/**
 * Returns an `Task` that yields the value of the first
 * `Task` to succeed.
 */
export function firstSuccess<R, E, A>(fas: NonEmptyArray<Task<R, E, A>>): Task<R, E, A> {
   return A.reduce_(NEA.tail(fas), NEA.head(fas), (b, a) => orElse_(b, () => a));
}
