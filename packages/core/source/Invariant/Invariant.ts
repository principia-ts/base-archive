import type * as HKT from "../HKT";
import { IMapF, UC_IMapF } from "./IMapF";

export interface Invariant<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly _imap: UC_IMapF<F, C>;
   readonly imap: IMapF<F, C>;
}
