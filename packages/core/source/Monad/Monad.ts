import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";
import type { ChainF, UC_ChainF } from "./ChainF";
import type { FlattenF } from "./FlattenF";

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C> {
   readonly chain_: UC_ChainF<F, C>;
   readonly chain: ChainF<F, C>;
   readonly flatten: FlattenF<F, C>;
}
