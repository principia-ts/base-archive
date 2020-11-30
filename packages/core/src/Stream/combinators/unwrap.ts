import type * as I from "../../IO";
import { fromEffect } from "../constructors";
import type { Stream } from "../model";
import { flatten } from "../monad";

export function unwrap<R, E, O>(fa: I.IO<R, E, Stream<R, E, O>>): Stream<R, E, O> {
  return flatten(fromEffect(fa));
}
