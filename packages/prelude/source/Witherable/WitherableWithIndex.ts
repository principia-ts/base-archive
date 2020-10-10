import type * as HKT from "../HKT";
import type { WiltWithIndexFn, WiltWithIndexFn_ } from "./WiltWithIndexFn";
import type { WitherWithIndexFn, WitherWithIndexFn_ } from "./WitherWithIndexFn";

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly witherWithIndex_: WitherWithIndexFn_<F, C>;
   readonly witherWithIndex: WitherWithIndexFn<F, C>;
   readonly wiltWithIndex_: WiltWithIndexFn_<F, C>;
   readonly wiltWithIndex: WiltWithIndexFn<F, C>;
}
