import type * as HKT from "../HKT";
import type { CompactFn } from "./CompactFn";
import type { SeparateFn } from "./SeparateFn";

export interface Compactable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly compact: CompactFn<F, C>;
   readonly separate: SeparateFn<F, C>;
}
