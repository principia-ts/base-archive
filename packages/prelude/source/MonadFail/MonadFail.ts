import type * as HKT from "../HKT";
import type { Monad } from "../Monad";
import type { FailF } from "./FailF";

export interface MonadFail<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
   readonly fail: FailF<F, C>;
}
