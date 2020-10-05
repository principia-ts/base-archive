import type * as HKT from "../HKT";
import { NoneF } from "./NoneF";

export interface None<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly none: NoneF<F, C>;
}
