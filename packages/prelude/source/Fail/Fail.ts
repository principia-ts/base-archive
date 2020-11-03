import type * as HKT from "../HKT";
import type { FailFn } from "./FailFn";

export interface Fail<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly fail: FailFn<F, TC>;
}
