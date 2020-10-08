import type * as HKT from "../HKT";
import type { CompactF } from "./CompactF";
import type { SeparateF } from "./SeparateF";

export interface Compactable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly compact: CompactF<F, C>;
   readonly separate: SeparateF<F, C>;
}
