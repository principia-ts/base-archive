import type * as HKT from "../HKT";
import type { SwapFn } from "./SwapFn";

export interface Swap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly swap: SwapFn<F, C>;
}
