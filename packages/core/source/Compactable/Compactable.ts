import type * as HKT from "../HKT";
import { CompactF } from "./CompactF";
import { SeparateF } from "./SeparateF";

export interface Compactable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly compact: CompactF<F, C>;
   readonly separate: SeparateF<F, C>;
}
