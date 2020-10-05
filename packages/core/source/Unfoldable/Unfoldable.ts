import type * as HKT from "../HKT";
import type { UnfoldF } from "./UnfoldF";

export interface Unfoldable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly unfold: UnfoldF<F, C>;
}
