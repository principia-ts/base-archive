import type * as HKT from "../HKT";
import type { AnyF } from "./AnyF";

export interface Any<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly any: AnyF<F, C>;
}
