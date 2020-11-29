import * as T from "./_internal/aio";
import { fromEffect } from "./constructors";
import type { Managed } from "./model";

export function unit(): Managed<unknown, never, void> {
  return fromEffect(T.unit());
}
