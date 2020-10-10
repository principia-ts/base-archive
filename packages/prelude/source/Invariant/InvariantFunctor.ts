import type * as HKT from "../HKT";
import type { IMapFn, IMapFn_ } from "./IMapF";

export interface Invariant<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly imap_: IMapFn_<F, TC>;
   readonly imap: IMapFn<F, TC>;
}
