import type * as HKT from "../HKT";
import type { ComposeF } from "./ComposeF";

export interface Semigroupoid<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly compose: ComposeF<F, C>;
}
