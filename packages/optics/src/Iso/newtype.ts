import type { Newtype } from "@principia/prelude";

import type { Iso } from "./model";

/*
 * -------------------------------------------
 * Newtype Iso
 * -------------------------------------------
 */

export function newtype<T extends Newtype<any, any>>(): Iso<T["_A"], T> {
  return {
    get: (_) => _ as any,
    reverseGet: (_) => _ as any
  };
}
