import type * as HKT from "../HKT";
import type { UnfoldFn } from "./UnfoldF";

export interface Unfoldable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly unfold: UnfoldFn<F, C>;
}
