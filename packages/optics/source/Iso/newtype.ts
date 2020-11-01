import type { Newtype } from "@principia/prelude";

import type { Iso } from "./model";

/*
 * -------------------------------------------
 * Newtype Iso
 * -------------------------------------------
 */

export const newtype = <T extends Newtype<any, any>>(): Iso<T["_A"], T> => ({
   get: (_) => _ as any,
   reverseGet: (_) => _ as any
});
