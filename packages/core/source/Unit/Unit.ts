import type * as HKT from "../HKT";
import type { UnitF } from "./UnitF";

export interface Unit<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly unit: UnitF<F, C>;
}
