import type * as HKT from "../../HKT";
import type { ApplicativeX } from "../ApplicativeX";
import type { ChainF, UC_ChainF } from "./ChainF";

export interface MonadX<F extends HKT.URIS, C = HKT.Auto> extends ApplicativeX<F, C> {
   readonly _chain: UC_ChainF<F, C>;
   readonly chain: ChainF<F, C>;
}
