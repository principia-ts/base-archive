import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { ExtendF, UC_ExtendF } from "./ExtendF";

export interface Extend<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
   readonly extend_: UC_ExtendF<F, C>;
   readonly extend: ExtendF<F, C>;
}
