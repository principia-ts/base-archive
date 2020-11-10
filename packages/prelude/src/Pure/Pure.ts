import type * as HKT from "../HKT";
import type { PureFn } from "./PureFn";

export interface Pure<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly pure: PureFn<F, TC>;
}
