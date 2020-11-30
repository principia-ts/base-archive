import * as I from "./_internal/io";
import { fromEffect } from "./constructors";
import type { Managed } from "./model";

export function unit(): Managed<unknown, never, void> {
  return fromEffect(I.unit());
}
