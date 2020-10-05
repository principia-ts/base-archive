import type * as HKT from "../HKT";
import type { Semigroupoid } from "../Semigroupoid";
import type { IdF } from "./IdF";

export interface Category<F extends HKT.URIS, C = HKT.Auto> extends Semigroupoid<F, C> {
   readonly id: IdF<F, C>;
}
