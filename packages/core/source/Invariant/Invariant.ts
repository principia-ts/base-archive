import type * as HKT from "../HKT";
import type { IMapF, UC_IMapF } from "./IMapF";

export interface Invariant<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly imap_: UC_IMapF<F, C>;
   readonly imap: IMapF<F, C>;
}
