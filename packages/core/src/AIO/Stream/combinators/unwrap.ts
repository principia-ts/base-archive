import type * as T from "../../AIO";
import { fromEffect } from "../constructors";
import type { Stream } from "../model";
import { flatten } from "../monad";

export function unwrap<R, E, O>(fa: T.AIO<R, E, Stream<R, E, O>>): Stream<R, E, O> {
  return flatten(fromEffect(fa));
}
